'use strict';

/**
 * Convert apidoc parsed data and project infos into OpenAPI 3.0 specification JSON string / object.
 */

function toOpenApi (apiData, projectInfo) {
  const parsedData = typeof apiData === 'string' ? JSON.parse(apiData) : apiData || [];
  const project = typeof projectInfo === 'string' ? JSON.parse(projectInfo) : projectInfo || {};

  const openapi = {
    openapi: '3.0.3',
    info: {
      title: project.title || project.name || 'API Documentation',
      description: project.description || '',
      version: project.version || '0.0.0',
    },
    paths: {},
  };

  if (project.url) {
    openapi.servers = [{ url: project.url }];
  }

  const tagsSet = new Set();

  parsedData.forEach(item => {
    if (!item.url || !item.type) {
      return;
    }

    const group = item.groupTitle || item.group;
    if (group) {
      tagsSet.add(group);
    }

    // Convert apidoc path format `/user/:id` to OpenAPI path format `/user/{id}`
    let path = item.url;
    // ensure path starts with '/'
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    // replace :param with {param}
    path = path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

    const method = item.type.toLowerCase();

    if (!openapi.paths[path]) {
      openapi.paths[path] = {};
    }

    const operation = {
      summary: item.title || item.name || '',
      description: item.description || '',
      operationId: item.name ? `${item.name}_${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined,
      parameters: [],
      responses: {},
    };

    if (group) {
      operation.tags = [group];
    }

    // Process Headers
    if (item.header && item.header.fields) {
      Object.keys(item.header.fields).forEach(headerGroup => {
        item.header.fields[headerGroup].forEach(field => {
          operation.parameters.push(createParameterObject(field, 'header'));
        });
      });
    }

    // Process Path / Query Parameters from item.parameter.fields
    if (item.parameter && item.parameter.fields) {
      Object.keys(item.parameter.fields).forEach(paramGroup => {
        // Param fields that are not body
        const fields = item.parameter.fields[paramGroup];
        if (paramGroup.toLowerCase() === 'body') {
          // Process as body fields if in parameter.fields.body
          processBodyFields(fields, operation);
        } else {
          fields.forEach(field => {
            // Check if field name matches path param
            const isPathParam = path.includes(`{${field.field}}`);
            const inLocation = isPathParam ? 'path' : 'query';
            operation.parameters.push(createParameterObject(field, inLocation));
          });
        }
      });
    }

    // Process standalone item.query
    if (Array.isArray(item.query)) {
      item.query.forEach(field => {
        const isPathParam = path.includes(`{${field.field}}`);
        const inLocation = isPathParam ? 'path' : 'query';
        operation.parameters.push(createParameterObject(field, inLocation));
      });
    }

    // Process standalone item.body
    if (Array.isArray(item.body) && item.body.length > 0) {
      processBodyFields(item.body, operation);
    }

    // Process Responses
    // Success responses
    let hasResponse = false;
    if (item.success && item.success.fields) {
      Object.keys(item.success.fields).forEach(statusGroup => {
        const statusCode = extractStatusCode(statusGroup) || '200';
        const fields = item.success.fields[statusGroup];
        operation.responses[statusCode] = createResponseObject(statusGroup, fields, item.success.examples);
        hasResponse = true;
      });
    }

    // Error responses
    if (item.error && item.error.fields) {
      Object.keys(item.error.fields).forEach(statusGroup => {
        const statusCode = extractStatusCode(statusGroup) || '400';
        const fields = item.error.fields[statusGroup];
        operation.responses[statusCode] = createResponseObject(statusGroup, fields, item.error.examples);
        hasResponse = true;
      });
    }

    // Fallback default response if none defined
    if (!hasResponse) {
      operation.responses['200'] = {
        description: 'Successful operation',
      };
    }

    openapi.paths[path][method] = operation;
  });

  if (tagsSet.size > 0) {
    openapi.tags = Array.from(tagsSet).map(name => ({ name }));
  }

  return JSON.stringify(openapi, null, 2);
}

function createParameterObject (field, inLocation) {
  const schema = mapTypeToSchema(field.type);
  if (field.defaultValue !== undefined) {
    schema.default = castValue(field.defaultValue, field.type);
  }
  if (field.allowedValues && field.allowedValues.length > 0) {
    schema.enum = field.allowedValues;
  }

  return {
    name: field.field,
    in: inLocation,
    description: field.description || '',
    required: inLocation === 'path' ? true : !field.optional,
    schema: schema,
  };
}

function processBodyFields (fields, operation) {
  if (!fields || fields.length === 0) return;

  const properties = {};
  const required = [];

  // Build nested schema from flat dot-notation fields
  fields.forEach(field => {
    const fieldName = field.field;
    if (!field.optional) {
      required.push(fieldName);
    }
    setNestedProperty(properties, fieldName, field);
  });

  operation.requestBody = {
    required: required.length > 0,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: properties,
        },
      },
    },
  };
}

function setNestedProperty (target, fieldPath, field) {
  const parts = fieldPath.split('.');
  let current = target;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      const schema = mapTypeToSchema(field.type);
      if (field.defaultValue !== undefined) {
        schema.default = castValue(field.defaultValue, field.type);
      }
      if (field.description) {
        schema.description = field.description;
      }
      current[part] = schema;
    } else {
      if (!current[part] || current[part].type !== 'object') {
        current[part] = {
          type: 'object',
          properties: {},
        };
      }
      current = current[part].properties;
    }
  }
}

function createResponseObject (description, fields, examples) {
  const response = {
    description: description || 'Response',
  };

  if (fields && fields.length > 0) {
    const properties = {};
    fields.forEach(field => {
      setNestedProperty(properties, field.field, field);
    });
    response.content = {
      'application/json': {
        schema: {
          type: 'object',
          properties: properties,
        },
      },
    };
  }

  // Check examples
  if (examples && examples.length > 0) {
    const jsonExample = examples.find(ex => ex.type === 'json' || ex.type === 'json5');
    if (jsonExample) {
      try {
        const parsedExample = JSON.parse(jsonExample.content);
        if (!response.content) {
          response.content = { 'application/json': {} };
        }
        response.content['application/json'].example = parsedExample;
      } catch (e) {
        // ignore parse error if example is HTTP status header string etc.
      }
    }
  }

  return response;
}

function extractStatusCode (str) {
  const match = str.match(/\b([1-5]\d\d)\b/);
  return match ? match[1] : null;
}

function mapTypeToSchema (typeStr) {
  if (!typeStr) return { type: 'string' };

  const type = typeStr.toLowerCase().trim();
  const isArray = type.endsWith('[]') || type.startsWith('array');

  if (isArray) {
    const itemType = type.replace('[]', '').replace(/^array\s*of\s*/i, '').trim();
    return {
      type: 'array',
      items: mapTypeToSchema(itemType),
    };
  }

  switch (type) {
    case 'number':
    case 'float':
    case 'double':
      return { type: 'number' };
    case 'int':
    case 'integer':
      return { type: 'integer' };
    case 'boolean':
    case 'bool':
      return { type: 'boolean' };
    case 'object':
      return { type: 'object', properties: {} };
    case 'date':
      return { type: 'string', format: 'date-time' };
    default:
      return { type: 'string' };
  }
}

function castValue (val, typeStr) {
  if (val === undefined || val === null) return val;
  const typeStrLower = typeStr ? typeStr.toLowerCase() : '';

  if (typeStrLower.includes('number') || typeStrLower.includes('int') || typeStrLower.includes('float')) {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }
  if (typeStrLower.includes('bool')) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return Boolean(val);
  }
  return val;
}

module.exports = {
  toOpenApi,
};

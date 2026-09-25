'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { toOpenApi } = require('../lib/to_openapi');

describe('OpenAPI 3.0 converter and CLI', function () {
  it('should convert apidoc data to OpenAPI 3.0 spec', function () {
    const mockData = [
      {
        type: 'get',
        url: '/user/:id',
        title: 'Get User',
        description: 'Get user details by ID',
        name: 'GetUser',
        group: 'User',
        groupTitle: 'User Group',
        parameter: {
          fields: {
            Parameter: [
              {
                field: 'id',
                type: 'Number',
                optional: false,
                description: 'User ID',
              },
            ],
          },
        },
        success: {
          fields: {
            'Success 200': [
              {
                field: 'name',
                type: 'String',
                optional: false,
                description: 'User name',
              },
            ],
          },
        },
      },
    ];

    const mockProject = {
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API description',
      url: 'https://api.test.com',
    };

    const openapiStr = toOpenApi(mockData, mockProject);
    const openapi = JSON.parse(openapiStr);

    assert.strictEqual(openapi.openapi, '3.0.3');
    assert.strictEqual(openapi.info.title, 'Test API');
    assert.strictEqual(openapi.info.version, '1.0.0');
    assert.strictEqual(openapi.servers[0].url, 'https://api.test.com');
    assert.ok(openapi.paths['/user/{id}']);
    assert.ok(openapi.paths['/user/{id}'].get);

    const getOp = openapi.paths['/user/{id}'].get;
    assert.strictEqual(getOp.summary, 'Get User');
    assert.strictEqual(getOp.parameters[0].name, 'id');
    assert.strictEqual(getOp.parameters[0].in, 'path');
    assert.strictEqual(getOp.parameters[0].required, true);
    assert.ok(getOp.responses['200']);
  });

  it('should create openapi.json file via CLI --openapi flag', async function () {
    const outputPath = './tmp/openapi_cli_test';
    fs.removeSync(outputPath);

    const cmd = `node ./bin/apidoc --openapi -i example -o ${outputPath} -q`;
    await exec(cmd);

    const openapiFilePath = path.join(outputPath, 'openapi.json');
    assert.strictEqual(fs.existsSync(openapiFilePath), true);

    const content = JSON.parse(fs.readFileSync(openapiFilePath, 'utf8'));
    assert.strictEqual(content.openapi, '3.0.3');
    assert.ok(content.paths['/category']);
  }).timeout(80000);

  it('should create custom named openapi file via CLI --openapi flag', async function () {
    const outputPath = './tmp/openapi_cli_custom_test';
    fs.removeSync(outputPath);

    const cmd = `node ./bin/apidoc --openapi custom-spec.json -i example -o ${outputPath} -q`;
    await exec(cmd);

    const customFilePath = path.join(outputPath, 'custom-spec.json');
    assert.strictEqual(fs.existsSync(customFilePath), true);
  }).timeout(80000);
});

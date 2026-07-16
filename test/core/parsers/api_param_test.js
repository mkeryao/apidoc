/**
 * Test: Parser apiParam
 */
const assert = require('assert');

// lib modules
const parser = require('../../../lib/core/parsers/api_param');

describe('Parser: apiParam', function () {
  // TODO: Add 1.000 more possible cases ;-)
  const testCases = [
    {
      title: 'Simple fieldname only',
      content: 'simple',
      expected: {
        group: 'Parameter',
        isArray: false,
        type: undefined,
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'simple',
        defaultValue: undefined,
        description: '',
      },
    },
    {
      title: 'Type, Fieldname, Description',
      content: '{String} name The users name.',
      expected: {
        group: 'Parameter',
        isArray: false,
        type: 'String',
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'The users name.',
      },
    },
    {
      title: 'Type, Fieldname, Description',
      content: '{String|String[]} name The users name.',
      expected: {
        group: 'Parameter',
        type: 'String|String[]',
        isArray: true,
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'The users name.',
      },
    },
    {
      title: '$Simple fieldname only',
      content: '$simple',
      expected: {
        group: 'Parameter',
        isArray: false,
        type: undefined,
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: '$simple',
        defaultValue: undefined,
        description: '',
      },
    },
    {
      title: 'All options, with optional defaultValue',
      content: ' ( MyGroup ) { \\Object\\String.uni-code_char[] { 1..10 } = \'abc\', \'def\' }  ' +
                     '[ \\MyClass\\field.user_first-name = \'John Doe\' ] Some description.',
      expected: {
        group: 'MyGroup',
        isArray: true,
        type: '\\Object\\String.uni-code_char[]',
        size: '1..10',
        allowedValues: ['\'abc\'', '\'def\''],
        optional: true,
        parentNode: undefined,
        field: '\\MyClass\\field.user_first-name',
        defaultValue: 'John Doe',
        description: 'Some description.',
      },
    },
    {
      title: 'All options, without optional-marker',
      content: ' ( MyGroup ) { \\Object\\String.uni-code_char[] { 1..10 } = \'abc\', \'def\' }  ' +
                     '\\MyClass\\field.user_first-name = \'John Doe\' Some description.',
      expected: {
        group: 'MyGroup',
        isArray: true,
        type: '\\Object\\String.uni-code_char[]',
        size: '1..10',
        allowedValues: ['\'abc\'', '\'def\''],
        optional: false,
        parentNode: undefined,
        field: '\\MyClass\\field.user_first-name',
        defaultValue: 'John Doe',
        description: 'Some description.',
      },
    },
    {
      title: 'All options, without optional-marker, without default value quotes',
      content: ' ( MyGroup ) { \\Object\\String.uni-code_char[] { 1..10 } = \'abc\', \'def\' }  ' +
                     '\\MyClass\\field.user_first-name = John_Doe Some description.',
      expected: {
        group: 'MyGroup',
        isArray: true,
        type: '\\Object\\String.uni-code_char[]',
        size: '1..10',
        allowedValues: ['\'abc\'', '\'def\''],
        optional: false,
        parentNode: undefined,
        field: '\\MyClass\\field.user_first-name',
        defaultValue: 'John_Doe',
        description: 'Some description.',
      },
    },
    {
      title: 'With Tag and Type',
      content: '[tag1] {String} name The users name.',
      expected: {
        group: 'Parameter',
        isArray: false,
        type: 'String',
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'The users name.',
        tag: 'tag1',
      },
    },
    {
      title: 'With Group and Tag',
      content: '(user)[tag1] {String} name The users name.',
      expected: {
        group: 'user',
        isArray: false,
        type: 'String',
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'The users name.',
        tag: 'tag1',
      },
    },
    {
      title: 'With Tag and Group',
      content: '[tag1](user) {String} name The users name.',
      expected: {
        group: 'user',
        isArray: false,
        type: 'String',
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'The users name.',
        tag: 'tag1',
      },
    },
    {
      title: 'With Tag and Optional Field',
      content: '[tag1] [name] The optional name.',
      expected: {
        group: 'Parameter',
        isArray: false,
        type: undefined,
        size: undefined,
        allowedValues: undefined,
        optional: true,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'The optional name.',
        tag: 'tag1',
      },
    },
    {
      title: 'With Tag and Field (No Type, matched by source prefix)',
      content: '[tag1] name Description',
      source: '@apiSuccess[tag1] name Description',
      expected: {
        group: 'Parameter',
        isArray: false,
        type: undefined,
        size: undefined,
        allowedValues: undefined,
        optional: false,
        parentNode: undefined,
        field: 'name',
        defaultValue: undefined,
        description: 'Description',
        tag: 'tag1',
      },
    },
  ];

  // create
  it('case 1: should pass all regexp test cases', function (done) {
    testCases.forEach(function (testCase) {
      const parsed = parser.parse(testCase.content, testCase.source);
      // TODO
      //(parsed !== null).should.equal(true, 'Title: ' + testCase.title + ', Source: ' + testCase.content);
      assert.deepEqual(parsed, testCase.expected);
    });
    done();
  });
});

# ejsf

Version 1.0.0

Creates a function (or its string equivalent) from an EJS template. The function accepts one argument which is used as data for the EJS template.

The string equivalent is useful for saving the resulting function into a JavaScript file.

## Installation

```
npm install git+https://github.com/JamesNgo-CoT/ejsf.git#1.0.0
```

## toFunction(ejsTemplate, options)

- ejsTemplate `string`
- options `object` Defaults: `'{}'`
- Returns: `function`

## toFunctionString(ejsTemplate, options)

- ejsTemplate `string`
- options `object` Defaults: `'{}'`
- Returns: `string`

## fromFileToFunction(filePath, options)

- filePath `string`
- options `object` Defaults: `'{}'`
- Returns: `function`

## fromFileToFunctionString(filePath, options)

- filePath `string`
- options `object` Defaults: `'{}'`
- Returns: `string`

## options

- cwd `string` The EJS template's current working directory. Defaults: `process.cwd()`
- dataArgName `string` Function argument name. Defaults: `DEFAULT_DATA_ARG_NAME`
- escapeFunctionName `string` HTML escape function name. Defaults: `DEFAULT_ESCAPE_FUNCTION_NAME`
- isInclude `boolean` Used internally, do not set. Defaults: `false`
- outputVariableName `string` Output variable name. Defaults: `DEFAULT_DATA_ARG_NAME`

## Constants

``` JavaScript
const DEFAULT_DATA_ARG_NAME = 'data';
const DEFAULT_ESCAPE_FUNCTION_NAME = 'escapeHtml';
const DEFAULT_OUTPUT_VARIABLE_NAME = 'output';
```

const Esprima = require('esprima');
const Fs = require('fs');
const Path = require('path');

// ----------
// CONSTANTS
// ----------

const DEFAULT_DATA_ARG_NAME = 'data';
const DEFAULT_ESCAPE_FUNCTION_NAME = 'escapeHtml';
const DEFAULT_OUTPUT_VARIABLE_NAME = 'output';

// ----------
// TRANSVERSE SYNTAX TREE
// ----------

function transverseSyntaxTree(syntaxTree, enterCallback, leaveCallback) {
	if (!syntaxTree || typeof syntaxTree !== 'object') {
		return;
	}

	if (Array.isArray(syntaxTree)) {
		for (const item of syntaxTree) {
			transverseSyntaxTree(item, enterCallback, leaveCallback);
		}
		return;
	}

	if (syntaxTree.type && enterCallback) {
		enterCallback(syntaxTree);
	}
	for (const key in syntaxTree) {
		transverseSyntaxTree(syntaxTree[key], enterCallback, leaveCallback);
	}
	if (syntaxTree.type && leaveCallback) {
		leaveCallback(syntaxTree);
	}
}

// ----------
// TO FUNCTION BODY
// ----------

function toFunctionBody(ejsTemplate, options = {}) {
	const {
		cwd = process.cwd(),
		dataArgName = DEFAULT_DATA_ARG_NAME,
		escapeFunctionName = DEFAULT_ESCAPE_FUNCTION_NAME,
		isInclude = false,
		outputVariableName = DEFAULT_OUTPUT_VARIABLE_NAME
	} = options;

	// -- EJS TEMPLATE TO SEGMENTS --

	const segments = [];

	let segment = {
		type: 'HTML',
		value: '',
		trimStart: false
	};

	const nextSegment = (nextSegmentType = 'HTML') => {
		segments.push(segment);
		segment = {
			type: nextSegmentType,
			value: '',
			trimStart: false
		};
	};

	for (let index = 0, length = ejsTemplate.length; index < length; index++) {
		const char0 = ejsTemplate.charAt(index);
		const char1 = ejsTemplate.charAt(index + 1);
		const char2 = ejsTemplate.charAt(index + 2);

		if (segment.type === 'HTML') {
			if (char0 === '<') {
				if (char1 === '%') {
					if (char2 === '_') {
						segment.value = segment.value.trimEnd();
						nextSegment('SCRIPTLET');
						index += 2;
						continue;
					}

					if (char2 === '=') {
						nextSegment('OUTPUT');
						index += 2;
						continue;
					}

					if (char2 === '-') {
						nextSegment('OUTPUT_UNESCAPED');
						index += 2;
						continue;
					}

					if (char2 === '#') {
						nextSegment('COMMENT');
						index += 2;
						continue;
					}

					if (char2 === '%') {
						segment += '<%';
						index += 2;
						continue;
					}

					nextSegment('SCRIPTLET');
					index += 1;
					continue;
				}
			}
		} else {
			if (char1 === '>' && char0 === '%') {
				nextSegment();
				index += 1;
				continue;
			}

			if (char2 === '>') {
				if (char1 === '%') {
					if (char0 === '-') {
						nextSegment();
						index += 2;
						continue;
					}

					if (char0 === '_') {
						nextSegment();
						segment.trimStart = true;
						index += 2;
						continue;
					}
				}
			}
		}

		segment.value += char0;
	}

	segments.push(segment);

	// -- SEGMENTS TO FUNCTION BODY --

	let functionBody = `let ${outputVariableName} = ''; `;

	for (let index = 0, length = segments.length; index < length; index++) {
		// const { type, value, trimStart } = segments[index];
		const segment = segments[index];
		switch (segment.type) {
			case 'HTML':
				if (segment.trimStart) {
					segment.value = segment.value.trimStart();
				}
				functionBody += `${outputVariableName} += \`${segment.value.replace(/`/g, '\\`')}\`; `;
				break;

			case 'SCRIPTLET':
				functionBody += `${segment.value.trim()} `;
				break;

			case 'OUTPUT':
				functionBody += `${outputVariableName} += ${escapeFunctionName}(${segment.value.trim()}); `;
				break;

			case 'OUTPUT_UNESCAPED':
				functionBody += `${outputVariableName} += (${segment.value.trim()}); `;
				break;

			case 'COMMENT':
				break;
		}
	}

	// -- ADD VARIABLE TO SYNTAX TREE --

	const syntaxTree = Esprima.parseScript(functionBody);

	const nodeChain = [];

	const addVariable = (name, kind) => {
		for (let index = nodeChain.length - 1; index >= 0; index--) {
			const node = nodeChain[index];

			if (
				node.type === 'Program' ||
				node.type === 'ArrowFunctionExpression' ||
				node.type === 'FunctionDeclaration' ||
				(
					kind !== 'var' &&
					(
						node.type === 'BlockStatement' ||
						node.type === 'ForStatement'
					)
				)
			) {
				if (!node.variables) {
					node.variables = [];
				}

				node.variables.push(name);

				return;
			}
		}
	};

	transverseSyntaxTree(syntaxTree, (node) => {
		// console.group(`[${node.type}]`);

		if (node.type === 'Identifier') {
			const index = nodeChain.length;
			const parentNode = nodeChain[index - 1];
			switch (parentNode.type) {
				case 'ArrowFunctionExpression':
					if (parentNode.params.indexOf(node) !== -1) {
						addVariable(node.name);
					}
					break;

				case 'LabeledStatement':
					if (parentNode.label === node) {
						addVariable(node.name);
					}
					break;

				case 'VariableDeclarator':
					if (parentNode.id === node) {
						const variableDeclarationNode = nodeChain[index - 2];
						addVariable(node.name, variableDeclarationNode.kind);
					}
					break;

				// default:
				// console.log(node);
				// console.log(parentNode);
			}
		}

		nodeChain.push(node);
	}, () => {
		nodeChain.pop();

		// console.groupEnd();
	});

	// -- FIND ESCAPES, INCLUDES AND UNDECLARED VARIABLES FROM SYNTAX TREE --

	const includePaths = [];
	const undeclaredVariables = [];

	const processVariable = (name) => {
		if (
			name === dataArgName ||
			name === 'AggregateError' ||
			name === 'Array' ||
			name === 'ArrayBuffer' ||
			name === 'AsyncFunction' ||
			name === 'AsyncGenerator' ||
			name === 'AsyncGeneratorFunction' ||
			name === 'Atomics' ||
			name === 'BigInt' ||
			name === 'BigInt64Array' ||
			name === 'BigUint64Array' ||
			name === 'Boolean' ||
			name === 'DataView' ||
			name === 'Date' ||
			name === 'decodeURI' ||
			name === 'decodeURIComponent' ||
			name === 'encodeURI' ||
			name === 'encodeURIComponent' ||
			name === 'Error' ||
			name === 'eval' ||
			name === 'EvalError' ||
			name === 'FinalizationRegistry' ||
			name === 'Float32Array' ||
			name === 'Float64Array' ||
			name === 'Function' ||
			name === 'Generator' ||
			name === 'GeneratorFunction' ||
			name === 'globalThis' ||
			name === 'Infinity' ||
			name === 'Int16Array' ||
			name === 'Int32Array' ||
			name === 'Int8Array' ||
			name === 'Intl' ||
			name === 'isFinite' ||
			name === 'isNaN' ||
			name === 'JSON' ||
			name === 'Map' ||
			name === 'Math' ||
			name === 'NaN' ||
			name === 'Number' ||
			name === 'Object' ||
			name === 'parseFloat' ||
			name === 'parseInt' ||
			name === 'Promise' ||
			name === 'Proxy' ||
			name === 'RangeError' ||
			name === 'ReferenceError' ||
			name === 'Reflect' ||
			name === 'RegExp' ||
			name === 'Set' ||
			name === 'SharedArrayBuffer' ||
			name === 'String' ||
			name === 'Symbol' ||
			name === 'SyntaxError' ||
			name === 'TypedArray' ||
			name === 'TypeError' ||
			name === 'Uint16Array' ||
			name === 'Uint32Array' ||
			name === 'Uint8Array' ||
			name === 'Uint8ClampedArray' ||
			name === 'undefined' ||
			name === 'URIError' ||
			name === 'WeakMap' ||
			name === 'WeakRef' ||
			name === 'WeakSet' ||
			undeclaredVariables.indexOf(name) !== -1
		) {
			return;
		}

		for (let index = nodeChain.length - 1; index >= 0; index--) {
			const node = nodeChain[index];
			if (node.variables && node.variables.indexOf(name) !== -1) {
				return;
			}
		}

		undeclaredVariables.push(name);
	};

	transverseSyntaxTree(syntaxTree, (node) => {
		if (node.type === 'Identifier') {
			const index = nodeChain.length;
			const parentNode = nodeChain[index - 1];

			switch (parentNode.type) {
				case 'CallExpression':
					if (parentNode.callee === node) {
						if (node.name === escapeFunctionName) {
							options.addEscapeFunction = true;
							break;
						}
						if (node.name === 'include') {
							const filePath = parentNode.arguments[0].value;
							if (includePaths.indexOf(filePath) === -1) {
								includePaths.push(filePath);
							}
							break;
						}
					}
					processVariable(node.name);
					break;

				case 'MemberExpression':
					if (parentNode.object === node) {
						processVariable(node.name);
					}
					break;

				case 'Property':
					if (parentNode.value === node) {
						processVariable(node.name);
					}
					break;

				default:
					processVariable(node.name);
			}
		}

		nodeChain.push(node);
	}, () => {
		nodeChain.pop();
	});

	// -- ADD PREFIX TO FUNCTION BODY --

	let prefix = '';

	if (includePaths.length > 0) {
		options.isInclude = true;
		prefix += 'const include = (path, data) => include[path](data); ';
		prefix += includePaths.map((filePath) => {
			options.cwd = cwd;
			return `include['${filePath}'] = ${fromFileToFunctionString(filePath, options)}; `;
		}).join('');
	}

	if (options.addEscapeFunction && !isInclude) {
		prefix = `const ${escapeFunctionName} = (value) => typeof value !== 'string' ? value : value.replace(/&/g, '&amp;').replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); ` + prefix;
	}

	if (undeclaredVariables.length > 0) {
		prefix += `const { ${undeclaredVariables.join(', ')} } = ${dataArgName}; `;
	}

	functionBody = prefix + functionBody;

	// -- ADD SUFFIX TO FUNCTION BODY --

	functionBody += `return ${outputVariableName};`;

	// -- RETURN --

	return functionBody;
}

// ----------
// TO FUNCTION
// ----------

function toFunction(ejsTemplate, options = {}) {
	const {
		dataArgName = DEFAULT_DATA_ARG_NAME
	} = options;
	const functionBody = toFunctionBody(ejsTemplate, options);
	return new Function(dataArgName, functionBody);
}

// ----------
// TO FUNCTION STRING
// ----------

function toFunctionString(ejsTemplate, options = {}) {
	const {
		dataArgName = DEFAULT_DATA_ARG_NAME
	} = options;
	const functionBody = toFunctionBody(ejsTemplate, options);
	return `(${dataArgName}) => { ${functionBody} }`;
}

// ----------
// FROM FILE TO FUNCTION BODY
// ----------

function fromFileToFunctionBody(filePath, options = {}) {
	const {
		cwd = process.cwd()
	} = options;

	if (Path.extname(filePath) !== '.ejs') {
		filePath = `${filePath}.ejs`;
	}
	if (!Path.isAbsolute(filePath)) {
		filePath = Path.join(cwd, filePath);
	}

	options.cwd = Path.dirname(filePath);

	const ejsTemplate = Fs.readFileSync(filePath, { encoding: 'utf8' });
	return toFunctionBody(ejsTemplate, options);
}

// ----------
// FROM FILE TO FUNCTION
// ----------

function fromFileToFunction(filePath, options = {}) {
	const {
		dataArgName = DEFAULT_DATA_ARG_NAME
	} = options;
	const functionBody = fromFileToFunctionBody(filePath, options);
	return new Function(dataArgName, functionBody);
}

// ----------
// FROM FILE TO FUNCTION STRING
// ----------

function fromFileToFunctionString(filePath, options = {}) {
	const {
		dataArgName = DEFAULT_DATA_ARG_NAME
	} = options;
	const functionBody = fromFileToFunctionBody(filePath, options);
	return `(${dataArgName}) => { ${functionBody} }`;
}

// ----------
// EXPORTS
// ----------

module.exports = {
	toFunction,
	toFunctionString,
	fromFileToFunction,
	fromFileToFunctionString
};

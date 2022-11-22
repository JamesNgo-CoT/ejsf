
const BabelCore = require('@babel/core');
const Fs = require('fs');
const Path = require('path');

const ejsf = require('../index');

const ejsFilePath = Path.join(__dirname, 'templates/main.ejs');
const functionString = `module.exports = ${ejsf.fromFileToFunctionString(ejsFilePath)};`;

const resultBasePath = Path.join(__dirname, Path.basename(ejsFilePath));

const esFilePath = `${resultBasePath}.es6.js`;
Fs.writeFileSync(esFilePath, functionString, { encoding: 'utf8' });

BabelCore.transform(functionString, { 'presets': ['@babel/preset-env'] }, (error, result) => {
	if (error) {
		console.error(error);
		return;
	}

	const jsFilePath = `${resultBasePath}.es5.js`;
	Fs.writeFileSync(jsFilePath, result.code, { encoding: 'utf8' });

	const jsRelativeFilePath = Path.relative(__dirname, jsFilePath);
	const ejsFunction = require(`${jsRelativeFilePath.charAt(0) === '.' ? '' : './'}${jsRelativeFilePath}`);

	const data = {
		"title": "Title -> Title"
	};

	const html = ejsFunction(data);
	const htmlFilePath = `${resultBasePath}.html`;
	Fs.writeFileSync(htmlFilePath, html, { encoding: 'utf8' });

	console.log('COMPLETE');
});

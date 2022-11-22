const BabelCore = require('@babel/core');
const Fs = require('fs');
const Path = require('path');

const ejsf = require('../index');

const ejsFilePath = Path.join(__dirname, 'template.ejs');
const functionString = `module.exports = ${ejsf.fromFileToFunctionString(ejsFilePath)};`;

const esFilePath = `${ejsFilePath}.es6.js`;
Fs.writeFileSync(esFilePath, functionString, { encoding: 'utf8' });

BabelCore.transform(functionString, { 'presets': ['@babel/preset-env'] }, (error, result) => {
	if (error) {
		console.error(error);
		return;
	}

	const jsFilePath = `${ejsFilePath}.es5.js`;
	Fs.writeFileSync(jsFilePath, result.code, { encoding: 'utf8' });

	const dataFilePath = Path.join(__dirname, 'data.json');
	const dataRelativeFilePath = Path.relative(__dirname, dataFilePath);
	const data = require(`${dataRelativeFilePath.charAt(0) === '.' ? '' : './'}${dataRelativeFilePath}`);

	const jsRelativeFilePath = Path.relative(__dirname, jsFilePath);
	const ejsFunction = require(`${jsRelativeFilePath.charAt(0) === '.' ? '' : './'}${jsRelativeFilePath}`);

	const html = ejsFunction(data);
	const htmlFilePath = `${ejsFilePath}.html`;
	Fs.writeFileSync(htmlFilePath, html, { encoding: 'utf8' });

	console.log('COMPLETE');
});



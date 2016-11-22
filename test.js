'use strict';

const fs = require('fs');
const babel = require("babel-core");

let code = fs.readFileSync('./libs/compiler.js', 'utf-8');

let result = babel.transform(code, {
    presets: [require('babel-preset-es2015')]
});

console.log(result.code);
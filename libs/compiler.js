'use strict';

module.exports = (()=> {
    const fs = require('fs');
    const path = require('path');

    let compiler = {};

    compiler.jade = (jadePath)=> new Promise((callback)=> {
        let parseRequireJS = (contents)=> {
            let scripts = contents.match(/\<script[^\>]+requirejs[^\>]+\>/gim);
            if (!scripts) scripts = [];
            for (let i = 0; i < scripts.length; i++) {
                let script = scripts[i];
                let changed = script.replace(/requirejs[\s]*=[\s]*\"([^\"]*)\"/gim, "");
                contents = contents.replace(script, changed);
            }
            return contents;
        };

        try {
            let jade = require("jade");
            let compiled = jade.compileFile(jadePath)();
            let depth = '';
            let tmp = path.resolve(jadePath);
            while (true) {
                tmp = path.resolve(tmp, '..');
                let base = path.basename(tmp);
                if (base == 'src') break;
                depth = '../' + depth;
            }

            if (depth == '') depth = './';
            compiled = compiled.replace(/\{\$ROOT\}\//gim, depth);
            compiled = parseRequireJS(compiled);
            callback({status: true, compiled: compiled, ext: '.html'});
        } catch (err) {
            callback({status: false, err: err, ext: '.html'});
        }
    });

    compiler.js = (jsPath)=> new Promise((callback)=> {
        let babel = require("babel-core");

        let contents = '';
        try {
            contents = fs.readFileSync(jsPath, 'utf-8');
            let compiled = babel.transform(contents, {
                presets: [require('babel-preset-es2015')],
                plugins: [
                    require('babel-plugin-transform-es2015-modules-commonjs')
                ],
                minified: true
            }).code;

            callback({status: true, compiled: compiled, ext: '.js'});
        } catch (err) {
        }
        return callback({status: false, err: err});
    });

    compiler.less = (lessPath) => new Promise((callback)=> {
        let less = require("less");
        let contents = '';
        try {
            contents = fs.readFileSync(lessPath, 'utf-8');
        } catch (err) {
            return callback({status: false, err: err});
        }

        less.render(contents, {filename: path.basename(lessPath), paths: [path.dirname(lessPath)], compress: true}, function (err, output) {
            if (err) return callback({status: false, err: err, ext: '.css'});
            let compiled = output.css;
            callback({status: true, compiled: compiled, ext: '.css'});
        });
    });

    return compiler;
})();
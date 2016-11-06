#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var fsext = require('fs-extra');
var clc = require("cli-color");
var app = require('./app');

var processPath = process.cwd();
var commands = process.argv.splice(2);

// check lwot project
if (commands[0] && commands[0] != 'create' && commands[0] != 'help') {
    if (fs.existsSync(path.join(processPath, 'lwot.json')) == false) {
        console.log(clc.red('[error]'), '"' + path.join(processPath, 'lwot.json') + '"', 'is not exsits in this directory.');
        return;
    }
}

var lastIndex = 0;
var fn = app;
var cmd = 'app';
var helpFile = '';
for (var i = 0; i < commands.length; i++) {
    if (typeof fn === 'function') break;
    var tmp = helpFile + '';
    if (helpFile === '') {
        helpFile = commands[i];
    } else {
        helpFile = helpFile + '.' + commands[i];
    }

    if (!fs.existsSync(path.join(__dirname, 'help', helpFile + '.md')))
        helpFile = tmp;

    cmd += ' ' + commands[i];
    if (!fn[commands[i]]) {
        fn = fn.default ? fn.default : fn.help;
        break;
    }

    fn = fn[commands[i]];
    lastIndex = i;
}

if (!fs.existsSync(path.join(__dirname, 'help', helpFile + '.md'))) helpFile = 'help.md';
else helpFile = helpFile + '.md';

var args = commands.splice(lastIndex + 1);
if (typeof fn === 'function') {
    fn(args).then((msg)=> {
        if (msg == 'help') {
            var marked = require('marked');
            var TerminalRenderer = require('marked-terminal');
            marked.setOptions({renderer: new TerminalRenderer()});
            var md = path.resolve(__dirname, 'help', helpFile);
            console.log(marked(fs.readFileSync(md, 'utf-8')));
        }
    });
} else if (!commands[0] || commands[0] === 'help') {
    var marked = require('marked');
    var TerminalRenderer = require('marked-terminal');
    marked.setOptions({renderer: new TerminalRenderer()});
    var md = path.resolve(__dirname, 'help', helpFile);
    console.log(marked(fs.readFileSync(md, 'utf-8')));
} else {
    console.log(`${clc.red('[platform]')} ${commands[0]} not exists. please "lwot install platform ${commands[0]}"`);
}
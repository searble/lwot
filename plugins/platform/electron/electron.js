'use strict';

module.exports = (()=> {
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');
    const spawn = require("child_process").spawn;

    const pluginRoot = path.resolve(__dirname);

    let terminal = (cmd, args)=> new Promise((callback)=> {
        const term = spawn(cmd, args);
        term.stdout.pipe(process.stdout);
        term.stderr.pipe(process.stderr);
        process.stdin.pipe(term.stdin);
        term.on('close', () => {
            process.stdin.end();
            callback();
        });
    });

    let plugin = {};

    plugin.add = (destPath)=> new Promise((callback)=> {
        let resPath = path.resolve(pluginRoot, 'res');
        fsext.copySync(resPath, destPath);
        callback();
    });

    plugin.run = (destPath)=> new Promise((callback)=> {
        terminal('electron', [destPath]).then(callback);
    });

    plugin.deploy = ()=> new Promise((callback)=> {

    });

    plugin.compiler = 'electron';

    return plugin;
})();
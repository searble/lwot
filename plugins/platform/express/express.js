'use strict';

module.exports = (()=> {
    const fs = require('fs');
    const path = require('path');
    const spawn = require("child_process").spawn;
    const fsext = require('fs-extra');
    const open = require("open");

    const pluginRoot = path.resolve(__dirname);

    let terminal = (cmd, args, opts)=> new Promise((callback)=> {
        const term = spawn(cmd, args, opts);
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
        let config = JSON.parse(fs.readFileSync(path.resolve(destPath, 'config.json'), 'utf-8'));
        terminal('node', ['express'], {cwd: destPath}).then(()=> {
            callback();
        });

        setTimeout(()=> {
            open('http://localhost:' + config.express.port);
        }, 500);
    });

    return plugin;
})();
'use strict';

module.exports = (()=> {
    const fs = require('fs');
    const path = require('path');
    const spawn = require("child_process").spawn;
    const fsext = require('fs-extra');

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
        fsext.removeSync(path.resolve(destPath));

        terminal('ionic', ['start', destPath, 'blank']).then(()=> {
            fsext.removeSync(path.resolve(destPath, 'www'));
            callback();
        });
    });

    plugin.run = (destPath)=> new Promise((callback)=> {
        terminal('ionic', ['serve', '--lab'], {cwd: destPath}).then(()=> {
            callback();
        });
    });

    plugin.deploy = ()=> new Promise((callback)=> {

    });

    return plugin;
})();
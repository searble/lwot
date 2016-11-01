'use strict';

module.exports = (()=> {
    const spawn = require('child_process').spawn;
    const url = require('url');
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    const HOMEDIR = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    const APP_DIR = path.resolve(HOMEDIR, '.lwot');

    // [lib]
    let app = {};

    // [lib] terminal
    app.terminal = (cmd, args, opts, mute)=> new Promise((callback)=> {
        let term = spawn(cmd, args, opts);

        if (!mute) {
            term.stdout.pipe(process.stdout);
            term.stderr.pipe(process.stderr);
            process.stdin.pipe(term.stdin);
        }


        term.on('close', () => {
            if (!mute)
                process.stdin.end();
            callback();
        });
    });

    app.npm = (srcDir, modules, mute)=> new Promise((callback)=> {
        if (!modules) modules = [];
        modules.unshift('--save');
        modules.unshift('install');
        app.terminal('npm', modules, {cwd: srcDir}, mute).then(callback);
    });

    app.bower = (srcDir, modules, mute)=> new Promise((callback)=> {
        if (!modules) modules = [];
        modules.unshift('--save');
        modules.unshift('install');
        app.terminal('bower', modules, {cwd: srcDir}, mute).then(callback);
    });

    // [lib] find plugins
    let plugins = (name, source)=> new Promise((callback)=> {
        let targetDir = path.resolve(APP_DIR, 'tmp', name);
        let tmpFolder = path.resolve(targetDir, new Date().getTime() + '');

        // remove tmp directory
        try {
            fsext.removeSync(path.resolve(APP_DIR, 'tmp'));
        } catch (e) {
        }

        // make tmp directory
        try {
            fsext.mkdirsSync(targetDir);
        } catch (e) {
        }

        let finder = ()=> new Promise((next)=> {
            // if source is in filesystem
            if (fs.existsSync(path.resolve(source))) {
                fsext.copySync(source, tmpFolder);
                next();
            }
            // if source is git repo.
            else {
                app.terminal('git', ['clone', source, tmpFolder], null, true)
                    .then(next);
            }
        });

        // installation
        let installation = ()=> new Promise((next)=> {
            if (fs.existsSync(path.resolve(tmpFolder)) === false) {
                next();
                return;
            }

            let obj = {path: path.resolve(tmpFolder)};
            let result = null;
            if (fs.existsSync(path.resolve(obj.path, 'package.json'))) {
                let p = JSON.parse(fs.readFileSync(path.resolve(obj.path, 'package.json'), 'utf-8'));
                if (p.name) {
                    obj.name = p.name;
                    fsext.removeSync(path.resolve(obj.path, '.git'));
                    fsext.removeSync(path.resolve(obj.path, '.gitignore'));
                    if (fs.existsSync(path.resolve(APP_DIR, 'plugins', name, obj.name)))
                        fsext.removeSync(path.resolve(APP_DIR, 'plugins', name, obj.name));
                    fsext.copySync(obj.path, path.resolve(APP_DIR, 'plugins', name, obj.name));
                    result = path.resolve(APP_DIR, 'plugins', name, obj.name);
                }
            }

            fsext.removeSync(path.resolve(APP_DIR, 'tmp'));

            if (result) {
                app.npm(result, null, true).then(()=> {
                    next();
                });
            } else {
                next();
            }
        });

        finder()
            .then(()=> installation())
            .then(callback);
    });

    app.plugins = {};

    app.plugins.platform = (source)=> plugins('platform', source);

    app.plugins.compiler = (source)=> plugins('compiler', source);


    return app;
})();
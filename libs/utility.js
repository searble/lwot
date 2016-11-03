'use strict';

module.exports = (()=> {
    const spawn = require('child_process').spawn;
    const url = require('url');
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    const HOMEDIR = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    const APP_DIR = path.resolve('.', '.lwot');
    const TMP_DIR = path.resolve(APP_DIR, 'tmp');

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
    let plugins = (PLUGIN_NAME, PLUGIN_SRC)=> new Promise((callback)=> {
        let TMP_FILE = path.resolve(TMP_DIR, new Date().getTime() + '');
        let PACAKGE_FILE = path.resolve(TMP_FILE, 'package.json');
        let DEST_PATH = path.resolve('.', 'plugins', PLUGIN_NAME);

        // remove tmp directory
        try {
            fsext.removeSync(TMP_DIR);
        } catch (e) {
        }

        // make tmp directory
        try {
            fsext.mkdirsSync(TMP_DIR);
        } catch (e) {
        }

        // find repo. and copy to tmp
        let finder = ()=> new Promise((next)=> {
            // if source is in filesystem
            if (fs.existsSync(path.resolve(PLUGIN_SRC))) {
                fsext.copySync(path.resolve(PLUGIN_SRC), TMP_FILE);
                next();
            }
            // if source is git repo.
            else {
                app.terminal('git', ['clone', PLUGIN_SRC, TMP_FILE], null, true)
                    .then(next);
            }
        });

        // installation
        let installation = ()=> new Promise((next)=> {
            if (fs.existsSync(path.resolve(TMP_FILE)) === false) {
                next();
                return;
            }

            fsext.removeSync(path.resolve(TMP_FILE, '.git'));
            fsext.removeSync(path.resolve(TMP_FILE, '.gitignore'));

            let DEST_FILE = null;
            if (fs.existsSync(PACAKGE_FILE)) {
                let PACKAGE_INFO = JSON.parse(fs.readFileSync(PACAKGE_FILE, 'utf-8'));

                if (PACKAGE_INFO.name && PACKAGE_INFO.plugin == PLUGIN_NAME) {
                    DEST_FILE = path.resolve(DEST_PATH, PACKAGE_INFO.name);
                    if (fs.existsSync(DEST_FILE))
                        fsext.removeSync(DEST_FILE);
                    fsext.copySync(TMP_FILE, DEST_FILE);
                }
            }

            fsext.removeSync(TMP_DIR);

            if (DEST_FILE) {
                app.npm(DEST_FILE, null, true).then(()=> {
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
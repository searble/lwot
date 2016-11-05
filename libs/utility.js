'use strict';

module.exports = (()=> {
    let spawn = require('child_process').spawn;
    // if windows
    if (process.platform == 'win32')
        spawn = require('cross-spawn');

    const url = require('url');
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');

    const APP_DIR = path.resolve('.', '.lwot');
    const TMP_DIR = path.resolve(APP_DIR, 'tmp');

    // [lib]
    let app = {};

    // [lib] terminal
    app.terminal = (cmd, args, opts, mute)=> new Promise((callback)=> {
        if (!opts) opts = {};
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
            // if source is not filesystem.
            else {
                // TODO find from repo.
                app.terminal('git', ['clone', PLUGIN_SRC, TMP_FILE], null, null).then(next);
            }
        });

        // installation
        let installation = ()=> new Promise((next)=> {
            let status = {error: true, data: ''};
            if (fs.existsSync(path.resolve(TMP_FILE)) === false) {
                status.data = 'DOWNLOAD ERROR';
                next(status);
                return;
            }

            fsext.removeSync(path.resolve(TMP_FILE, '.git'));
            fsext.removeSync(path.resolve(TMP_FILE, '.gitignore'));

            if (!fs.existsSync(PACAKGE_FILE)) {
                status.data = 'package.json not exists in this folder.';
                next(status);
                return;
            }

            let PACKAGE_INFO = JSON.parse(fs.readFileSync(PACAKGE_FILE, 'utf-8'));

            if (!PACKAGE_INFO.name || !PACKAGE_INFO.plugin) {
                status.data = 'package.json is missing required. name, plugin.';
                next(status);
                return;
            }

            if (PLUGIN_NAME !== 'auto' && PACKAGE_INFO.plugin != PLUGIN_NAME) {
                status.data = 'package.json is missing required. name, plugin.';
                next(status);
                return;
            }

            let DEST_PATH = path.resolve('.', 'plugins', PACKAGE_INFO.plugin);
            let DEST_FILE = path.resolve(DEST_PATH, PACKAGE_INFO.name);
            if (fs.existsSync(DEST_FILE))
                fsext.removeSync(DEST_FILE);
            fsext.copySync(TMP_FILE, DEST_FILE);
            fsext.removeSync(TMP_DIR);

            if (PACKAGE_INFO.plugin == 'platform') {
                let APP_PATH = path.resolve(DEST_FILE, 'app');
                let APP_PACKAGEJSON = path.resolve(APP_PATH, 'package.json');
                let APP_CONTROLLER = path.resolve(APP_PATH, 'controller');
                let PROJECT_CONTROLLER = path.resolve('.', 'controller', PACKAGE_INFO.name);

                if (!fs.existsSync(PROJECT_CONTROLLER)) {
                    fsext.mkdirsSync(PROJECT_CONTROLLER);

                    if (fs.existsSync(APP_CONTROLLER)) {
                        fsext.copySync(APP_CONTROLLER, PROJECT_CONTROLLER);
                        fsext.removeSync(APP_CONTROLLER);
                    }

                    if (fs.existsSync(APP_PACKAGEJSON)) {
                        fsext.copySync(APP_PACKAGEJSON, path.resolve(PROJECT_CONTROLLER, 'package.json'));
                    }
                }
            } // TODO mvc, struct

            app.npm(DEST_FILE, null, null).then(()=> {
                delete status.error;
                status.lwot = PACKAGE_INFO;
                next(status);
            });
        });

        finder()
            .then(()=> installation())
            .then((status)=> {
                callback(status);
            });
    });

    app.plugins = {};

    app.plugins.auto = (source)=> plugins('auto', source);

    app.plugins.platform = (source)=> plugins('platform', source);

    app.plugins.compiler = (source)=> plugins('compiler', source);

    app.plugins.struct = (source)=> plugins('struct', source);

    app.plugins.mvc = (source)=> plugins('mvc', source);

    return app;
})();
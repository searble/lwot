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
    const LWOT_TMP_PATH = path.join(path.resolve("."), ".lwot");
    const INCLUDE_TREE_PATH = path.join(LWOT_TMP_PATH, "jadeIncludeRelationTree.json");

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
    let plugins = (PLUGIN_NAME, PLUGIN_SRC, PLUGIN_REPO_NAME)=> new Promise((callback)=> {
        let TMP_FILE = path.resolve(TMP_DIR, new Date().getTime() + '');
        let PACAKGE_FILE = path.resolve(TMP_FILE, 'package.json');

        let URI = null;

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
            // [TODO] PLUGIN_SRC pattern check: 1. version (eg. 0.0.1), 2. exists file system, 3. git url
            // [TODO] if version, PLUGIN_SRC = PLUGIN_REPO_NAME#PLUGIN_SRC

            // if source is in filesystem
            if (fs.existsSync(path.resolve(PLUGIN_SRC))) {
                URI = PLUGIN_SRC;
                fsext.copySync(path.resolve(PLUGIN_SRC), TMP_FILE);
                next();
            }
            // if source is not filesystem.
            else {
                if (PLUGIN_SRC === 'electron') PLUGIN_SRC = 'https://github.com/searble/lwot-platform-electron';
                if (PLUGIN_SRC === 'express') PLUGIN_SRC = 'https://github.com/searble/lwot-platform-express';
                if (PLUGIN_SRC === 'ionic') PLUGIN_SRC = 'https://github.com/searble/lwot-platform-ionic';
                if (PLUGIN_SRC === 'cordova') PLUGIN_SRC = 'https://github.com/searble/lwot-platform-cordova';

                URI = PLUGIN_SRC;

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
                status.uri = URI;
                next(status);
            });
        });

        finder()
            .then(()=> installation())
            .then((status)=> {
                callback(status);
            });
    });

    // [module] find Jade Files
    let findJadeFiles = (rootPath, result) => {
        if (!result)
            result = [];

        if (fs.existsSync(rootPath) === false)
            return result;

        // Add File
        if (fs.lstatSync(rootPath).isDirectory() === false) {
            if ((/\.jade$/gim).test(rootPath))
                result.push(rootPath);

            return result;
        }

        // Find Directory Traversal
        let files = fs.readdirSync(rootPath);

        for (let i = 0; i < files.length; i++) {
            let file = path.join(rootPath, files[i]);
            findJadeFiles(file, result);
        }

        return result;
    };

    // [lib] createJadeIncludeRelationTree : Generation of Jade Files Include Relation Tree.
    app.createJadeIncludeRelationTree = (SOURCE_ROOT) => {
        if (fs.existsSync(INCLUDE_TREE_PATH))
            fs.unlinkSync(INCLUDE_TREE_PATH);

        let jadeFiles = findJadeFiles(SOURCE_ROOT);
        let metaObj = {};

        for (let i = 0; i < jadeFiles.length; i++) {
            let includeInfo = app.parseIncludeInfo(jadeFiles[i]);

            if (includeInfo)
                metaObj = app.createMetaInfo(metaObj, jadeFiles[i], includeInfo);
        }

        fs.writeFileSync(INCLUDE_TREE_PATH, JSON.stringify(metaObj), "UTF-8");
    };

    // [lib] parseIncludeInfo : Calculate Jade Files Include Relation.(return JSON Array)
    app.parseIncludeInfo = function (filePath) {
        let contents = fs.readFileSync(filePath, "UTF-8");
        contents = contents.replace(/[\/]+[\s]*include[\s]+[^\n]+/gim, "");
        let includeInfo = contents.match(/include[\s]+[^\n]+/gim);

        if (includeInfo) {
            for (let i = 0; i < includeInfo.length; i++) {
                includeInfo[i] = (/include[\s]+([^\n]+)/gim).exec(includeInfo[i])[1];

                if (includeInfo[i].indexOf("./") == 0 || includeInfo[i].substr(0, 1) != ".")
                    includeInfo[i] = path.dirname(filePath) + "/" + includeInfo[i].replace(/[\.]+[\/]+/gim, "") + ".jade";
                else {
                    let dirPath = path.dirname(filePath).split("/");
                    let distance = includeInfo[i].match(/\.\.\//gim).length;
                    let resultPath = "";

                    for (var j = 1; j < dirPath.length - distance; j++)
                        resultPath += "/" + dirPath[j];

                    resultPath += "/" + includeInfo[i].replace(/[\.]+[\/]+/gim, "");
                    includeInfo[i] = resultPath + ".jade";
                }
            }

            return includeInfo;
        }

        return [];
    };

    // [lib] createMetaInfo : Generation of Jade Files Include Relation Meta Object.
    app.createMetaInfo = function (metaObj, filePath, includeInfo) {
        for (let i = 0; i < includeInfo.length; i++) {
            if (!(fs.existsSync(includeInfo[i])))
                continue;

            if (!metaObj[includeInfo[i]])
                metaObj[includeInfo[i]] = [filePath];
            else {
                let j = 0;

                for (j = 0; j < metaObj[includeInfo[i]].length; j++) {
                    if (filePath == metaObj[includeInfo[i]][j])
                        break;
                }

                if (j == metaObj[includeInfo[i]].length)
                    metaObj[includeInfo[i]].push(filePath);
            }
        }

        return metaObj;
    };

    app.plugins = {};

    app.plugins.auto = (source, name)=> plugins('auto', source, name);

    app.plugins.platform = (source, name)=> plugins('platform', source, name);

    app.plugins.struct = (source, name)=> plugins('struct', source, name);

    app.plugins.mvc = (source, name)=> plugins('mvc', source, name);

    return app;
})();
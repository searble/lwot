'use strict';

module.exports = (()=> {
    const clc = require("cli-color");
    const path = require("path");
    const fs = require("fs");
    const fsext = require('fs-extra');
    const fsTracer = require('./libs/fs-tracer');
    const utility = require('./libs/utility');

    const PROJECT_ROOT = path.resolve('.');
    const SOURCE_ROOT = path.resolve(PROJECT_ROOT, 'src');
    const CONTROLLER_ROOT = path.resolve(PROJECT_ROOT, 'controller');
    const PLUGIN_ROOT = path.resolve(PROJECT_ROOT, 'plugins');

    let messageBroker = function () {
        if (arguments.length <= 2) return;
        let color = arguments[0];
        let cmd = arguments[1];
        let message = '';
        for (let i = 2; i < arguments.length; i++)
            message = message + arguments[i] + ' ';
        console.log(clc[color]('[' + cmd + ']'), message);
    };

    // [module] load plugin
    let plugins = (()=> {
        let lib = {};
        if (fs.existsSync(PLUGIN_ROOT) === false)
            return lib;

        let pluginList = fs.readdirSync(PLUGIN_ROOT);
        for (let i = 0; i < pluginList.length; i++) {
            let PLUGIN_DIR = path.resolve(PLUGIN_ROOT, pluginList[i]);
            let PLUGIN_NAME = pluginList[i];
            if (fs.lstatSync(PLUGIN_DIR).isDirectory() === false)
                continue;

            lib[PLUGIN_NAME] = {};

            let files = fs.readdirSync(PLUGIN_DIR);
            for (let i = 0; i < files.length; i++) {
                let platformPath = path.resolve(PLUGIN_DIR, files[i]);
                if (fs.lstatSync(platformPath).isDirectory() === false) continue;
                let MODULE_NAME = files[i];
                lib[PLUGIN_NAME][MODULE_NAME] = require(platformPath);
            }
        }
        return lib;
    })();

    // [lib]
    let lib = {};

    // [lib] global: create
    lib.create = (args)=> new Promise((callback)=> {
        if (!args || args.length == 0) {
            callback('help');
            return;
        }

        let libPath = __dirname;
        let initPath = path.resolve(libPath, 'res', 'init');
        let destPath = path.resolve('.', args[0]);

        if (fs.existsSync(destPath)) {
            messageBroker('red', 'create', '"' + destPath + '"', 'already exists');
            callback();
            return;
        }

        fsext.copySync(initPath, destPath);

        utility.bower(destPath).then(()=> {
            messageBroker('cd', destPath);
            callback();
        });
    });

    // [lib] inner project: install, bower, build, watch, platform, run, deploy

    lib.install = (cmds)=> new Promise((callback)=> {
        if (!cmds || cmds.length === 0) return callback('help');
        let plugin = cmds[0];
        if (!utility.plugins[plugin]) return callback('help');

        let pluginUrl = cmds[1];

        if (!pluginUrl) {
            messageBroker('yellow', 'install', `lwot install ${plugin} https://github.com/name/repo.`);
            callback();
            return;
        }

        messageBroker('blue', 'install', plugin);

        utility.plugins[plugin](pluginUrl).then(()=> {
            messageBroker('blue', 'install', plugin, pluginUrl, 'installed');
            callback();
        });
    });

    lib.bower = (args)=> new Promise((callback)=> {
        if (!args) args = [];
        utility.bower(PROJECT_ROOT, args).then(callback);
    });

    lib.build = (platforms)=> new Promise((callback)=> {
        let dest = [];
        let PLATFORM_ROOT = path.resolve(PLUGIN_ROOT, 'platform');
        if (platforms.length == 0)
            platforms = fs.readdirSync(PLATFORM_ROOT);

        // find platforms
        for (let i = 0; i < platforms.length; i++)
            if (fs.lstatSync(path.resolve(PLATFORM_ROOT, platforms[i])).isDirectory())
                dest.push({name: platforms[i], dest: path.resolve(PLATFORM_ROOT, platforms[i], 'app')});

        let idx = 0;
        let compileLoop = ()=> {
            let destPoint = dest[idx++];
            if (!destPoint) {
                callback();
                return;
            }

            let st = new Date();

            let CTRL_SRC = path.resolve(CONTROLLER_ROOT, destPoint.name);
            let CTRL_DEST = path.resolve(destPoint.dest, 'controller');
            let WWW_SRC = SOURCE_ROOT;
            let WWW_DEST = path.resolve(destPoint.dest, 'www');
            let BOWER_SRC = path.resolve(PROJECT_ROOT, 'bower_components');
            let BOWER_DEST = path.resolve(WWW_DEST, 'libs');

            let compilerName = null;
            let compilerFn = null;
            if (plugins.platform[destPoint.name].compiler)
                compilerName = plugins.platform[destPoint.name].compiler;

            if (compilerName && (!plugins.compiler || !plugins.compiler[compilerName])) {
                messageBroker('red', 'build', compilerName, 'compiler not exists');
                compileLoop();
                return;
            } else {
                if (plugins.compiler)
                    compilerFn = plugins.compiler[compilerName];
            }

            if (!fs.existsSync(CTRL_DEST)) fsext.mkdirsSync(CTRL_DEST);
            if (!fs.existsSync(WWW_DEST)) fsext.mkdirsSync(WWW_DEST);

            // compile ui components
            fsTracer.compile(compilerFn, WWW_SRC, WWW_DEST, true, true)
                .then(()=> fsTracer.compile(null, CTRL_SRC, CTRL_DEST, true, true))
                .then(()=> new Promise((next)=> {
                    if (fs.existsSync(path.resolve(CTRL_SRC, 'package.json')))
                        fsext.copySync(path.resolve(CTRL_SRC, 'package.json'), path.resolve(destPoint.dest, 'package.json'));

                    try {
                        fsext.mkdirsSync(BOWER_DEST);
                    } catch (e) {
                    }

                    try {
                        fsext.copySync(BOWER_SRC, BOWER_DEST);
                    } catch (e) {
                    }

                    next();
                }))
                .then(()=> utility.npm(destPoint.dest))
                .then(()=> {
                    let duetime = new Date().getTime() - st.getTime();
                    messageBroker('blue', 'build', destPoint.name, '(' + duetime + 'ms)');
                    compileLoop();
                });
        };

        compileLoop();
    });

    lib.watch = (platforms)=> new Promise((callback)=> {
        lib.build(JSON.parse(JSON.stringify(platforms))).then(()=> {
            let SRC_WATCH = [];
            let CTRL_WATCH = [];
            let PLATFORM_ROOT = path.resolve(PLUGIN_ROOT, 'platform');
            if (platforms.length == 0)
                platforms = fs.readdirSync(PLATFORM_ROOT);

            for (let i = 0; i < platforms.length; i++) {
                if (fs.lstatSync(path.resolve(PLATFORM_ROOT, platforms[i])).isDirectory()) {
                    let compilerName = null;
                    let compilerFn = null;
                    if (plugins.platform[platforms[i]].compiler)
                        compilerName = plugins.platform[platforms[i]].compiler;

                    if (compilerName && (!plugins.compiler || !plugins.compiler[compilerName])) {
                        messageBroker('red', 'build', compilerName, 'compiler not exists');
                        return;
                    } else {
                        if (plugins.compiler)
                            compilerFn = plugins.compiler[compilerName];
                    }
                    SRC_WATCH.push({compiler: compilerFn, dest: path.resolve(PLATFORM_ROOT, platforms[i], 'app', 'www')});
                    CTRL_WATCH.push({compiler: null, dest: path.resolve(PLATFORM_ROOT, platforms[i], 'app', 'controller')});
                }
            }

            messageBroker('blue', 'watch', 'now watching src folder');
            fsTracer.watch(SOURCE_ROOT, SRC_WATCH);
            fsTracer.watch(CONTROLLER_ROOT, CTRL_WATCH);
            callback();
        });
    });

    // [lib] run
    lib.run = (platforms)=> new Promise((callback)=> {
        let platform = platforms[0];

        if (!platform) {
            callback('help');
            return;
        }

        if (!plugins.platform || !plugins.platform[platform]) {
            messageBroker('red', `${platform} not exists. please "install platform ${platform}"`);
            callback();
            return;
        }

        if (!plugins.platform[platform].run) {
            messageBroker('yellow', 'run', platform, 'not support run.');
            callback();
            return;
        }

        messageBroker('blue', 'run', platform);
        plugins.platform[platform].run().then(callback);
    });

    // [lib] deploy
    lib.deploy = (platforms)=> new Promise((callback)=> {
        let platform = platforms[0];
        if (!platform) {
            callback('help');
            return;
        }

        let destPath = path.resolve('.', 'platform', platform);

        if (!plugins.platform[platform] || !plugins.platform[platform].deploy) {
            messageBroker('yellow', 'deploy', `'${platform}' not supported deploy.`);
            callback();
            return;
        }

        if (fs.existsSync(destPath) === false) {
            messageBroker('red', 'deploy', `'${platform}' not exists.`);
            callback();
            return;
        }

        plugins.platform[platform].deploy(destPath).then(()=> {
            messageBroker('red', 'deploy', `'${platform}' deployed`);
            callback();
        });
    });

    return lib;
})();
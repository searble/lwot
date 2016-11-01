'use strict';

module.exports = (()=> {
    const clc = require("cli-color");
    const path = require("path");
    const fs = require("fs");
    const fsext = require('fs-extra');
    const fsTracer = require('./libs/fs-tracer');
    const utility = require('./libs/utility');
    const HOMEDIR = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    const APP_DIR = path.resolve(HOMEDIR, '.lwot');

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
        let PLUGIN_ROOT = path.resolve(APP_DIR, 'plugins');
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

    // prebuilt
    fsTracer.setCompiler(plugins.compiler ? plugins.compiler : {});

    // [lib]
    let lib = {};

    // [lib] global: create, install
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

    // [lib] inner project: bower, build, watch, platform, run, deploy
    lib.bower = (args)=> new Promise((callback)=> {
        if (!args) args = [];
        let destPath = path.resolve('.');
        utility.bower(destPath, args).then(callback);
    });
    lib.build = (platforms)=> new Promise((callback)=> {
        let builder = ()=> new Promise(()=> {
            let dest = [];

            if (platforms.length == 0) {
                dest.push({name: '', dest: 'www'});
                platforms = fs.readdirSync(path.resolve('.', 'platform'));
            }

            for (let i = 0; i < platforms.length; i++)
                if (fs.lstatSync(path.resolve('.', 'platform', platforms[i])).isDirectory())
                    dest.push({name: platforms[i], dest: path.resolve('.', 'platform', platforms[i], 'www')});

            for (let i = 0; i < dest.length; i++) {
                if (dest[i].dest === 'www') continue;
            }

            let idx = 0;
            let compileLoop = ()=> {
                let destPoint = dest[idx++];
                if (!destPoint) {
                    callback();
                    return;
                }

                let st = new Date();
                try {
                    fsext.mkdirsSync(path.resolve(destPoint.dest, 'libs'));
                } catch (e) {
                }

                try {
                    fsext.copySync('./www/libs/', path.resolve(destPoint.dest, 'libs'));
                } catch (e) {
                }

                let mCompiler = null;
                try {
                    if (destPoint.dest === 'www')
                        mCompiler = 'default';
                    else if (plugins.platform[destPoint.name].compiler)
                        mCompiler = plugins.platform[destPoint.name].compiler;
                    else
                        mCompiler = 'default';
                } catch (e) {
                }

                if (!mCompiler) {
                    messageBroker('red', 'build', 'compiler not exists', destPoint.dest);
                    compileLoop();
                    return;
                }

                fsTracer.compile(mCompiler, 'src', destPoint.dest, true, true).then(()=> {
                    let duetime = new Date().getTime() - st.getTime();
                    messageBroker('blue', 'build', destPoint.dest, '(' + duetime + 'ms)');
                    compileLoop();
                });
            };

            compileLoop();
        });

        builder();
    });
    lib.watch = (platforms)=> new Promise((callback)=> {
        lib.build(JSON.parse(JSON.stringify(platforms))).then(()=> {
            let dest = [];
            if (platforms.length == 0) {
                dest.push({compiler: 'default', dest: 'www'});
                platforms = fs.readdirSync(path.resolve('.', 'platform'));
            }

            for (let i = 0; i < platforms.length; i++) {
                if (fs.lstatSync(path.resolve('.', 'platform', platforms[i])).isDirectory()) {
                    let mCompiler = plugins.platform[platforms[i]].compiler;
                    if (!mCompiler) mCompiler = 'default';
                    dest.push({compiler: mCompiler, dest: path.resolve('.', 'platform', platforms[i], 'www')});
                }
            }

            messageBroker('blue', 'watch', 'now watching src folder');
            fsTracer.watch('src', dest);
            callback();
        });
    });

    lib.platform = {};
    lib.platform.add = (platforms)=> new Promise((callback)=> {
        let added = 0;
        let adding = (idx)=> {
            let platform = platforms[idx];
            if (!platform) {
                if (added === 0)
                    callback('help');
                return callback();
            }

            if (!plugins.platform[platform] || !plugins.platform[platform].add) {
                adding(idx + 1);
                return;
            }

            let destPath = path.resolve('.', 'platform', platform);

            if (fs.existsSync(destPath)) {
                messageBroker('red', 'platform add', '"' + platform + '"', 'already exists');
                added++;
                adding(idx + 1);
                return;
            }

            try {
                fsext.mkdirsSync(destPath);
            } catch (e) {
            }

            try {
                let pluginInfo = JSON.parse(fs.readFileSync(path.resolve(APP_DIR, 'plugins', 'platform', platform, 'package.json'), 'utf-8'));
                let packageInfo = JSON.parse(fs.readFileSync(path.resolve('.', 'lwot.json'), 'utf-8'));
                if (!packageInfo.platform) packageInfo.platform = [];
                packageInfo.platform.push({name: platform, repository: pluginInfo.repository});
                fs.writeFileSync(path.resolve('.', 'lwot.json'), JSON.stringify(packageInfo, null, 4));
            } catch (e) {
            }

            plugins.platform[platform].add(destPath)
                .then(()=> lib.platform.npm([platform]))
                .then(()=> lib.build([platform]))
                .then(()=> {
                    messageBroker('blue', 'platform add', '"' + platform + '"', 'installed');
                    added++;
                    adding(idx + 1);
                });
        };

        adding(0);
    });
    lib.platform.rm = (platforms)=> new Promise((callback)=> {
        if (platforms.length === 0) callback('help');
        for (let i = 0; i < platforms.length; i++) {
            let platform = platforms[i];
            let destPath = path.resolve('.', 'platform', platform);
            fsext.removeSync(destPath);

            try {
                let packageInfo = JSON.parse(fs.readFileSync(path.resolve('.', 'lwot.json'), 'utf-8'));
                if (!packageInfo.platform) packageInfo.platform = [];
                for (let i = 0; i < packageInfo.platform.length; i++)
                    if (packageInfo.platform[i].name == platform)
                        packageInfo.platform.splice(i--, 1);
                fs.writeFileSync(path.resolve('.', 'lwot.json'), JSON.stringify(packageInfo, null, 4));
            } catch (e) {
            }

            messageBroker('blue', 'platform rm', platform);
        }
        callback();
    });
    lib.platform.npm = (args)=> new Promise((callback)=> {
        let platform = args[0];
        if (!platform) {
            callback('help');
            return;
        }

        let destPath = path.resolve('.', 'platform', platform);
        if (fs.existsSync(destPath) === false) {
            messageBroker('red', 'platform install', platform, 'not exists. please `platform add ' + platform + '`');
            callback();
            return;
        }

        args.splice(0, 1);
        utility.npm(destPath, args).then(callback);
    });

    // [lib] run
    lib.run = (platforms)=> new Promise((callback)=> {
        let platform = platforms[0];
        if (!platform) {
            callback('help');
            return;
        }

        let destPath = path.resolve('.', 'platform', platform);

        if (!plugins.platform[platform] || !plugins.platform[platform].run) {
            messageBroker('yellow', 'run', platform, 'not support run.');
            callback();
            return;
        }

        if (fs.existsSync(destPath) === false) {
            messageBroker('red', 'run', platform, 'not exists. please `platform add ' + platform + '`');
            callback();
            return;
        }

        messageBroker('blue', 'run', platform);
        plugins.platform[platform].run(destPath).then(callback);
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
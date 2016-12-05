'use strict';

module.exports = (()=> {
    const clc = require("cli-color");
    const path = require("path");
    const fs = require("fs");
    const fsext = require('fs-extra');
    const fsTracer = require('./libs/fs-tracer');
    const utility = require('./libs/utility');

    const PROJECT_ROOT = path.resolve('.');
    const LWOT_FILE = path.resolve(PROJECT_ROOT, 'lwot.json');
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

    let loadPlugins = ()=> {
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
                try {
                    lib[PLUGIN_NAME][MODULE_NAME] = require(platformPath);
                } catch (e) {
                }

            }
        }
        return lib;
    };

    // [module] load plugin
    let plugins = loadPlugins();

    // [module] platform dependent functions
    let platformFunction = (fn, platforms)=> new Promise((callback)=> {
        let st = new Date();

        let platform = platforms.splice(0, 1)[0];

        if (!fn) {
            messageBroker('yellow', platform, `use platform functions. eg) 'lwot ${platform} run'`);
            return;
        }

        if (!platform) {
            callback('help');
            return;
        }

        if (!plugins.platform || !plugins.platform[platform]) {
            messageBroker('red', fn, `${platform} not exists. please "lwot install platform ${platform}"`);
            callback();
            return;
        }

        if (!plugins.platform[platform][fn]) {
            messageBroker('yellow', fn, `${platform} not support ${fn}.`);
            callback();
            return;
        }

        messageBroker('blue', fn, `${fn} start '${platform}'`);

        plugins.platform[platform][fn](platforms).then(()=> {
            let duetime = new Date().getTime() - st.getTime();
            messageBroker('blue', fn, `${fn} finished '${platform}' (${duetime}ms)`);
            callback();
        });
    });

    // [lib]
    let lib = {};

    // [lib] create: create project
    lib.create = (args)=> new Promise((callback)=> {
        let st = new Date();

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
        fsext.copySync(path.resolve(libPath, 'res', 'idea', 'project.iml'), path.resolve(destPath, '.idea', args[0] + '.iml'));
        fsext.copySync(path.resolve(libPath, 'res', 'idea', 'misc.xml'), path.resolve(destPath, '.idea', 'misc.xml'));
        fsext.copySync(path.resolve(libPath, 'res', 'idea', 'jsLibraryMappings.xml'), path.resolve(destPath, '.idea', 'jsLibraryMappings.xml'));
        fs.writeFileSync(path.resolve(destPath, '.idea', 'modules.xml'), fs.readFileSync(path.resolve(libPath, 'res', 'idea', 'modules.xml'), 'utf-8').replace(/PRJNAME/gim, args[0]));

        let lwotjson = JSON.parse(fs.readFileSync(path.resolve(destPath, 'lwot.json'), 'utf-8'));
        lwotjson.name = args[0];
        fs.writeFileSync(path.resolve(destPath, 'lwot.json'), JSON.stringify(lwotjson, null, 4));

        utility.bower(destPath).then(()=> {
            let duetime = new Date().getTime() - st.getTime();
            messageBroker('blue', 'create', `created at '${destPath}' (${duetime}ms)`);
            callback();
        });
    });

    // [lib] install, i: install plugins
    lib.install = (cmds)=> new Promise((callback)=> {
        let st = new Date();
        let lwotConfig = JSON.parse(fs.readFileSync(LWOT_FILE, 'utf-8'));

        let finalize = (plugin, packageName)=> new Promise((resolve)=> {
            plugins = loadPlugins();
            if (plugins[plugin][packageName] && plugins[plugin][packageName].install) {
                plugins[plugin][packageName].install().then(()=> {
                    let duetime = new Date().getTime() - st.getTime();
                    messageBroker('blue', 'install', `${plugin} "${packageName}" installed (${duetime}ms)`);
                    resolve();
                });
            } else {
                let duetime = new Date().getTime() - st.getTime();
                messageBroker('blue', 'install', `${plugin} "${packageName}" installed (${duetime}ms)`);
                resolve();
            }
        });


        if (!cmds || cmds.length === 0) {
            // copy webstorm settings
            if (!fs.existsSync(path.resolve('.', '.idea'))) {
                fsext.copySync(path.resolve(__dirname, 'res', 'idea', 'project.iml'), path.resolve('.', '.idea', lwotConfig.name + '.iml'));
                fsext.copySync(path.resolve(__dirname, 'res', 'idea', 'misc.xml'), path.resolve('.', '.idea', 'misc.xml'));
                fsext.copySync(path.resolve(__dirname, 'res', 'idea', 'jsLibraryMappings.xml'), path.resolve('.', '.idea', 'jsLibraryMappings.xml'));
                fs.writeFileSync(path.resolve('.', '.idea', 'modules.xml'), fs.readFileSync(path.resolve(__dirname, 'res', 'idea', 'modules.xml'), 'utf-8').replace(/PRJNAME/gim, lwotConfig.name));
            }

            if (!lwotConfig.dependencies) {
                return;
            }

            let installList = [];
            for (let pluginName in lwotConfig.dependencies) {
                for (let plugin in lwotConfig.dependencies[pluginName]) {
                    let pluginInfo = lwotConfig.dependencies[pluginName][plugin];
                    installList.push({name: plugin, plugin: pluginName, uri: pluginInfo});
                }
            }

            let idx = 0;
            let autoInstall = ()=> {
                let pinfo = installList[idx++];
                if (!pinfo) {
                    let duetime = new Date().getTime() - st.getTime();
                    messageBroker('blue', 'install', `installed (${duetime}ms)`);
                    callback();
                    return;
                }

                let then = (status)=> {
                    if (status.error)
                        messageBroker('red', 'install', `${pinfo.plugin} "${pinfo.name}" ${status.message} error in install.`);
                    autoInstall();
                };

                utility.plugins[pinfo.plugin](pinfo.uri, pinfo.name).then((status)=> {
                    finalize(pinfo.plugin, pinfo.name).then(()=> {
                        then(status);
                    });
                });
            };

            messageBroker('blue', 'install', 'auto install');
            autoInstall();
            return;
        }

        let plugin = cmds[0];
        let pluginUrl = cmds[1];

        if (!pluginUrl) {
            plugin = 'auto';
            pluginUrl = cmds[0];
        } else if (!utility.plugins[plugin]) {
            return callback('help');
        }

        messageBroker('blue', 'install', plugin);

        utility.plugins[plugin](pluginUrl).then((status)=> {
            if (status.error) {
                messageBroker('red', 'install', status.message);
                return;
            }

            let packageName = status.lwot.name;
            let packageVersion = status.lwot.version;
            plugin = status.lwot.plugin;

            if (!lwotConfig.dependencies) lwotConfig.dependencies = {};
            if (!lwotConfig.dependencies[plugin]) lwotConfig.dependencies[plugin] = {};
            lwotConfig.dependencies[plugin][packageName] = status.uri;
            fs.writeFileSync(LWOT_FILE, JSON.stringify(lwotConfig, null, 4));

            finalize(plugin, packageName).then(callback);
        });
    });

    lib.i = lib.install;

    // [lib] remove, rm: remove plugins
    lib.remove = (cmds)=> new Promise((callback)=> {
        let plugin = cmds[0];
        let packageName = cmds[1];

        if (!plugin || !utility.plugins[plugin] || !packageName) {
            callback('help');
            return;
        }

        if (!utility.plugins[plugin]) {
            callback('help');
            return;
        }

        let REMOVE_PATH = path.resolve(PLUGIN_ROOT, plugin, packageName);
        if (!fs.existsSync(REMOVE_PATH)) {
            messageBroker('yellow', 'remove', `${plugin} "${packageName}" does not installed.`);
            callback();
            return;
        }

        fsext.removeSync(REMOVE_PATH);
        let lwotConfig = JSON.parse(fs.readFileSync(LWOT_FILE, 'utf-8'));
        delete lwotConfig.dependencies[plugin][packageName];
        fs.writeFileSync(LWOT_FILE, JSON.stringify(lwotConfig, null, 4));
        messageBroker('blue', 'remove', `${plugin} "${packageName}" removed.`);
    });
    lib.rm = lib.remove;

    // TODO [lib] publish, pub: publish to http://lwot.org repo.
    lib.publish = (args)=> new Promise((callback)=> {
    });
    lib.pub = lib.publish;

    // [lib] clean: clean plugins
    lib.clean = ()=> new Promise((callback)=> {
        if (!fs.existsSync(PLUGIN_ROOT)) {
            messageBroker('yellow', 'clean', `any plugins does not installed.`);
            callback();
            return;
        }

        fsext.removeFileSync(PLUGIN_ROOT);
        let lwotConfig = JSON.parse(fs.readFileSync(LWOT_FILE, 'utf-8'));
        delete lwotConfig.dependencies;
        fs.writeFileSync(LWOT_FILE, JSON.stringify(lwotConfig, null, 4));
        messageBroker('yellow', 'clean', `project clean`);
    });

    // [lib] bower: lwot bower install
    lib.bower = (args)=> new Promise((callback)=> {
        if (!args) args = [];
        args.push('--save');
        utility.terminal('bower', args, {cwd: PROJECT_ROOT}).then(callback);
    });

    // [lib] npm: lwot npm [platform] [npm-cmd] [node_modules] ...
    lib.npm = (args)=> new Promise((callback)=> {
        let platfromName = args.splice(0, 1)[0];
        let ncmd = args.splice(0, 1)[0];
        if (!platfromName || !ncmd) {
            callback('help');
            return;
        }

        let APP_ROOT = path.resolve(PLUGIN_ROOT, 'platform', platfromName, 'app');
        let APP_PACKAGE_FILE = path.resolve(APP_ROOT, 'package.json');
        let CTRL_PACKAGE_FILE = path.resolve(CONTROLLER_ROOT, platfromName, 'package.json');

        if (!fs.existsSync(APP_ROOT)) {
            messageBroker('yellow', 'npm', `"${platfromName}" does not installed.`);
            callback();
            return;
        }

        if (!fs.existsSync(APP_PACKAGE_FILE)) {
            messageBroker('yellow', 'npm', `"${platfromName}" does not support npm.`);
            callback();
            return;
        }

        let params = JSON.parse(JSON.stringify(args));
        params.unshift('--save');
        params.unshift(ncmd);

        utility.terminal('npm', params, {cwd: APP_ROOT}).then(()=> {
            if (!fs.existsSync(CTRL_PACKAGE_FILE)) {
                fsext.copySync(APP_PACKAGE_FILE, CTRL_PACKAGE_FILE);
            } else {
                let cpf = JSON.parse(fs.readFileSync(CTRL_PACKAGE_FILE, 'utf-8'));
                let apf = JSON.parse(fs.readFileSync(APP_PACKAGE_FILE, 'utf-8'));
                cpf.dependencies = apf.dependencies;
                fs.writeFileSync(CTRL_PACKAGE_FILE, JSON.stringify(cpf, null, 4));
            }

            messageBroker('blue', 'npm', `installed to "${platfromName}"`);
            callback();
        });
    });

    // [lib] build
    lib.build = (platforms)=> new Promise((callback)=> {
        let dest = [];
        let PLATFORM_ROOT = path.resolve(PLUGIN_ROOT, 'platform');
        if (platforms.length == 0)
            platforms = fs.readdirSync(PLATFORM_ROOT);

        // find platforms
        for (let i = 0; i < platforms.length; i++)
            if (fs.lstatSync(path.resolve(PLATFORM_ROOT, platforms[i])).isDirectory())
                dest.push({name: platforms[i], dest: path.resolve(PLATFORM_ROOT, platforms[i], 'app')});

        // Generation of jadeIncludeRelationTree.json
        utility.createJadeIncludeRelationTree(SOURCE_ROOT);

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

            let compilerFn = require('./libs/compiler');
            if (plugins.platform[destPoint.name].compile && typeof plugins.platform[destPoint.name].compile == 'object')
                compilerFn = plugins.platform[destPoint.name].compile;

            if (fs.existsSync(CTRL_DEST)) {
                fsext.removeSync(CTRL_DEST);
            }

            if (!fs.existsSync(WWW_DEST)) {
                fsext.removeSync(WWW_DEST);
            }

            fsext.mkdirsSync(CTRL_DEST);
            fsext.mkdirsSync(WWW_DEST);

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

    // [lib] watch
    lib.watch = (platforms)=> new Promise((callback)=> {
        lib.build(JSON.parse(JSON.stringify(platforms))).then(()=> {
            let SRC_WATCH = [];
            let CTRL_WATCH = [];
            let PLATFORM_ROOT = path.resolve(PLUGIN_ROOT, 'platform');
            if (platforms.length == 0)
                platforms = fs.readdirSync(PLATFORM_ROOT);

            for (let i = 0; i < platforms.length; i++) {
                if (fs.lstatSync(path.resolve(PLATFORM_ROOT, platforms[i])).isDirectory()) {
                    let compilerFn = require('./libs/compiler');
                    if (plugins.platform[platforms[i]].compile && typeof plugins.platform[platforms[i]].compile == 'object')
                        compilerFn = plugins.platform[platforms[i]].compile;

                    SRC_WATCH.push({
                        compiler: compilerFn,
                        dest: path.resolve(PLATFORM_ROOT, platforms[i], 'app', 'www')
                    });
                    CTRL_WATCH.push({
                        compiler: null,
                        dest: path.resolve(PLATFORM_ROOT, platforms[i], 'app', 'controller')
                    });
                }
            }

            messageBroker('blue', 'watch', 'now watching src folder');
            fsTracer.watch(SOURCE_ROOT, SRC_WATCH);
            fsTracer.watch(CONTROLLER_ROOT, CTRL_WATCH);
            callback();
        });
    });

    // TODO [lib] struct
    lib.struct = ()=> new Promise((callback)=> {
    });

    // TODO [lib] template
    lib.template = ()=> new Promise((callback)=> {
    });

    lib.v = lib['-v'] = lib.version = ()=> new Promise((callback)=> {
        let version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')).version;
        console.log(`v${version}`);
    });

    // [lib] bind platform function
    for (let platform in plugins.platform)
        if (!lib[platform])
            lib[platform] = (args) => new Promise((next)=> {
                let fn = args.splice(0, 1);
                args.unshift(platform);
                platformFunction(fn, args).then(next);
            });

    return lib;
})();
'use strict';

module.exports = (()=> {
    const fs = require('fs');
    const path = require('path');
    const fsext = require('fs-extra');
    const clc = require("cli-color");

    // [MODULE] app
    let app = {};

    // delete path
    app.deletePath = (deletePath, exception)=> {
        deletePath = path.resolve(deletePath);
        if (fs.existsSync(deletePath) === false) return;

        // pass exception
        if (exception)
            for (let i = 0; i < exception.length; i++)
                if (path.basename(deletePath) == exception[i])
                    return false;

        // delete file
        if (fs.lstatSync(deletePath).isDirectory() === false) {
            fs.unlinkSync(deletePath);
            return;
        }

        // delete recursive
        let cleanDelete = true;
        let files = fs.readdirSync(deletePath);
        for (let i = 0; i < files.length; i++) {
            let file = path.resolve(deletePath, files[i]);
            if (app.deletePath(file, exception) === false)
                cleanDelete = false;
        }

        if (cleanDelete)
            fs.rmdirSync(deletePath);
        return cleanDelete;
    };

    // find files
    app.findFiles = (rootPath, result, depth)=> {
        if (!depth) depth = 0;
        if (!result) result = [];
        if (fs.existsSync(rootPath) === false) return result;

        // add file
        if (fs.lstatSync(rootPath).isDirectory() === false) {
            result.push(rootPath);
            return result;
        }

        // find recursive
        let files = fs.readdirSync(rootPath);
        for (let i = 0; i < files.length; i++) {
            let file = path.join(rootPath, files[i]);
            app.findFiles(file, result, depth + 1);
        }

        return result;
    };

    // compile
    app.compile = (compiler, rootPath, compilePath, noLog, onlyError)=> new Promise((callback)=> {
        if (!compiler) compiler = {};

        rootPath = path.resolve(rootPath);
        compilePath = path.resolve(compilePath);

        // find files recursive
        let files = app.findFiles(rootPath);
        let fi = 0; // file index

        if (files.length == 0)
            files.push(rootPath);

        // compile
        let compile = ()=> {
            let file = files[fi++];
            if (!file) return callback();

            let fileExists = fs.existsSync(file);
            let extension = path.extname(file);
            let basename = path.basename(file, extension);
            let dest = file.replace(rootPath, compilePath);

            if (fileExists === true && fs.lstatSync(rootPath).isDirectory() === false)
                dest = compilePath;

            try {
                if (fileExists)
                    fsext.mkdirsSync(path.dirname(dest));
            } catch (e) {
            }

            let _compiler = compiler[extension.replace('.', '')];

            // if compiler exists
            if (_compiler) {
                _compiler(file).then((result)=> {
                    dest = path.resolve(dest, '..', basename + result.ext);

                    if (result.status === false) { // if compile failed
                        app.deletePath(dest);

                        if (fs.existsSync(file) === false)
                            if (fileExists === false)
                                if (!noLog) console.log(clc.red('[remove]'), file);

                        if (fileExists === true) {
                            if (!noLog || onlyError) console.log(clc.red('[error]'), file);
                            if (!noLog || onlyError) console.log(result.err);
                        }

                        return compile();
                    } else { // if compile success
                        fs.writeFileSync(dest, result.compiled);
                        if (!noLog) console.log(clc.green('[compile]'), dest);
                    }

                    compile();
                });
                return;
            }

            // file deleted in root
            if (fileExists === false) {
                app.deletePath(dest);
                if (!noLog) console.log(clc.red('[remove]'), file);
                return compile();
            }

            // copy to destination
            let buf = fs.readFileSync(file);
            fs.writeFileSync(dest, buf);
            if (!noLog) console.log(clc.green('[copy]'), file, dest);
            compile();
        };

        compile();
    });

    // watch
    app.watch = (rootPath, compilePaths)=> {
        let watch = require('node-watch');
        watch(rootPath, (filename)=> {
            let idx = 0;
            let cpi = ()=> {
                let compilePath = compilePaths[idx++];
                if (!compilePath)
                    return;
                let dest = filename.replace(rootPath, compilePath.dest);
                let comp = compilePath.compiler;

                let isController = path.basename(rootPath) === 'controller' ? true : false;

                if (isController) {
                    let src = filename.replace(rootPath, '').split('/')[1];
                    let platform = path.basename(path.resolve(compilePath.dest, '..', '..'));
                    if (src != platform) {
                        cpi();
                        return;
                    }

                    dest = filename.replace(path.resolve(rootPath, platform), compilePath.dest);
                }

                app.compile(comp, filename, dest).then(()=> {
                    cpi();
                });
            };

            cpi();
        });
    };

    return app;
})();
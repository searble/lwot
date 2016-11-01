var fs = require('fs');

fs.getFiles = function getFiles(dir, files_) {
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files) {
        var name = dir + '/' + files[i];
        if (files[i] != '.git' && files[i] != '.idea' && fs.statSync(name).isDirectory()) {
            getFiles(name, files_);
        } else if (files[i] != '.git' && files[i] != '.idea') {
            files_.push(name);
        }
    }
    return files_;
};

module.exports = fs;
module.exports = function (opts) {
    return function (req, res, next) {
        var mysql = require('mysql');
        req.mysql = mysql.createConnection(opts);

        res.org_send = res.send;
        res.org_render = res.render;
        res.org_download = res.download;

        res.send = function (data) {
            req.mysql.end(function () {
                res.org_send(data);
            });
        };

        res.render = function (jade, variable) {
            req.mysql.end(function () {
                res.org_render(jade, variable);
            });
        };

        res.download = function (path) {
            req.mysql.end(function () {
                res.org_download(path);
            });
        };

        req.sql = function (sql, values, cb) {
            return req.mysql.query(sql, values, function (err, rows) {
                if (cb)
                    cb(err, rows);
            });
        };

        next();
    };
};
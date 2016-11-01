module.exports = function (config) {
    return function (req, res, next) {
        var sendmail = function (to, subject, html, cb) {
            var mailserver = {
                user: config.user,
                password: config.password,
                host: config.host,
                ssl: config.ssl
            };

            var emailjs = require('emailjs');
            var mail = emailjs.server.connect(mailserver);

            mail.send({
                from: config.from,
                to: to,
                subject: subject,
                text: '',
                attachment: {
                    data: html,
                    alternative: true
                }
            }, function (err) {
                cb(err);
            });
        };

        req.sendmail = sendmail;

        next();
    };
};
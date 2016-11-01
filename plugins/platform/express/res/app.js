/* Express */
var express = require("express");
var app = express();

/* Cookie / Request Body Parser */
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

/* Session */
var session = require("express-session");
var RedisStore = require("connect-redis")(session);
var Redis = require("ioredis");

/* ETC */
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var fs = require("./modules/fs");

const rootPath = path.resolve(__dirname);

try {
    fs.statSync(rootPath + "/config.json");
}
catch (err) {
    if (err.code == "ENOENT")
        console.log("Setting the 'config-sample.json', Change the file name to 'config.json'");
    else
        console.log(err);

    process.exit(-1);
}

const configJSON = JSON.parse(fs.readFileSync(rootPath + "/config.json") + "");
const serviceConfig = configJSON.express;

/* Listening Port Setting */
app.set("port", serviceConfig.port);

/* Logger Setting */
app.use(logger("dev"));

/* Cookie / Request Body Parser Setting */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

/* Static Path Setting */
app.use(express.static(path.join(__dirname, 'www')));

/* Favicon Setting */
//app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

/* Session Setting */
var redisClient = new Redis(serviceConfig.redis);
app.use(session({
    secret: serviceConfig.session.secret,
    store: new RedisStore({client: redisClient}),
    resave: serviceConfig.session.resave,
    saveUninitialized: serviceConfig.session.saveUninitialized
}));

/* Middlewares Setting */
var middlewares = {
    cache: require("./middlewares/cache"),
    email: require("./middlewares/email"),
    encrypt: require("./middlewares/encrypt"),
    mysql: require("./middlewares/mysql")
};

app.use(middlewares.cache());
app.use(middlewares.email(serviceConfig.sendmail));
app.use(middlewares.encrypt(serviceConfig.encrypt));
app.use(middlewares.mysql(serviceConfig.mysql));

/* API Routes Setting */
var api_routes = fs.getFiles("./api");
for (var i = 0; i < api_routes.length; i++) {
    var rpath = "./" + api_routes[i].substring("./".length, api_routes[i].length);
    var rmodule = require(rpath);
    var href = "/api" + rpath.substring("./api".length, rpath.length - 3);
    console.log("[routes]", href);
    app.use(href, rmodule);
}

/* Exception Handling */
// not found error
app.use(function (req, res, next) {
    var err = new Error("Not Found");
    err.status = 404;

    res.status(err.status || 500);
    res.send("404 Not Found");
});

// error page
app.use(function (err, req, res) {
    res.status(err.status || 500);
    res.send("404 Not Found");
});

module.exports = app;

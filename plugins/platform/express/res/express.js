var fs = require('fs');
var app = require('./app');
var http = require('http');
var path = require('path');

/* Service Config Loading */
const rootPath = path.resolve(__dirname);
const configJSON = JSON.parse(fs.readFileSync(rootPath + '/config.json') + '');
var serviceConfig = configJSON.express;

/* Server Creation */
var server = http.createServer(app);

/* Server Listening Start(Destination Port : serviceConfig.port) */
server.listen(serviceConfig.port);

/* Server Event Listening Start */
server.on('error', onError);
server.on('listening', onListening);

/* Event Listener */
function onError(error) {
    console.log("express.js : onError() : Error!");
    process.exit(1);
}

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

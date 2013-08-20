var http = require('http'),
    droneStream = require('dronestream'),
    httpServer;

httpServer = http.createServer(function(req, res) {
   require('fs').createReadStream(__dirname + '/index.html').pipe(res);
});

droneStream.listen(httpServer);
httpServer.listen(8000);
console.log('Server started at localhost:8000');
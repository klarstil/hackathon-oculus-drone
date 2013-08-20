var http = require('http'),
    droneStream = require('dronestream'),
    io = require('socket.io'),
    httpServer, socket;

httpServer = http.createServer(function(req, res) {
   require('fs').createReadStream(__dirname + '/index.html').pipe(res);
});
socket = io.listen(8080);
droneStream.listen(httpServer);
httpServer.listen(8000);

socket.on('connection', function(client) {
	console.log("Socket server is start on port 8080");
	
	client.on('rotation', function(event) {
		console.log('Got message from client', event);
	});
});

console.log('Server is start on 8000');
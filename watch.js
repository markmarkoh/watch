//TODO: check port, retry on another port if taken

var port = exports.port = 7201,
    io = require("socket.io").listen(port),
    fs = require("fs"),
    path = require("path"),
    http = require('http'),
    client = __dirname + '/lib/watch.client.js';
  io.sockets.on('connection', function(socket) {

      // keep track of watched files
      var watching = [];
    
      // when the client gives us a file to watch add watch listener    
      socket.on('watchfile', function(data) {

          // if we got a file and it isn't already being watched
          if (data.name.length && !(data.name in watching) ) {
             filename = data.name.split('?')[0]; 
              path.exists(filename, function(exists) {
                if (exists) {
                  fs.watchFile(filename, {interval: 50}, function(curr, prev) {
                    // send client notification of change if this file was modified and not just accessed
                    if (curr.mtime > prev.mtime) {
                      socket.emit("file changed", {file: curr, location: data.location, type : data.type, name: data.name});
                    }
                  });
                } else {
                  console.log(filename, "can't find");
                }

              });
            
              // add to array of watched files
              watching.push(data.name);
          }
      });
  });

String.prototype.endsWith = function(search) {
  return this.match(search + "$");
}

console.info('Staring Watch.js server...');

http.createServer(function (request, response) {
  if(request.url.endsWith('watch.js')) {
    fs.readFile(client, function(err, data) {
      if (err) {
      console.log(err);
        return;
      }
      response.writeHead(200, {"Content-Type": "application/javascript"});
      response.end(data);   
    });
  }
}).listen(7202);

console.info('Watch.js server started on port 7202');
console.info('Add <script src="http://localhost:7202/watch.js"></script> to your HTML');



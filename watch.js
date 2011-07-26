//TODO: check port, retry on another port if taken

var port = exports.port = 7201,
    io = require("socket.io").listen(port),
    fs = require("fs"),
    path = require("path"),
    http = require('http'),
    client = __dirname + '/lib/watch.client.js';

var init = exports.init = function(static_dir) {
  console.log('starting sockets app', static_dir);
  io.sockets.on('connection', function(socket) {

      // keep track of watched files
      var watching = [];
    
      // when the client gives us a file to watch add watch listener    
      socket.on('watchfile', function(data) {
          var filename  = data.name.split('?')[0], 
              location  = data.location, 
              type      = data.type, 
              name      = data.name;

          // if we got a file and it isn't already being watched
          if (data.name.length && !(data.name in watching) ) {
              filename = data.name.split('?')[0]; 
              watching.push(data.name);

              path.exists(static_dir + '/' + filename, function(exists) {
                if (exists) {
                  fs.watchFile(static_dir + '/' + filename, {interval: 50}, function(curr, prev) {
                    // send client notification of change if this file was modified and not just accessed
                    if (curr.mtime > prev.mtime) {
                      console.log("altered", [filename,location,type]);
                      socket.emit("file changed", {file: curr, location: location, type : type, name: name});
                    }
                  });
                } else {
                  console.log(static_dir + '/' + filename, "can't find");
                }

              });
            
              // add to array of watched files
              watching.push(data.name);
          }
      });
  });
  return 'started';
}

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

//start
//if(!module.parent) { init('.'); }


var io = require("socket.io").listen(7201),
    fs = require("fs"),
    path = require("path");

io.sockets.on('connection', function(socket) {

    // initial connection
    socket.emit('connection successful', {hello : 'world'});

    // keep track of watched files
    var watching = [];
    
    // when the client gives us a file to watch add watch listener    
    socket.on('watchfile', function(data) {

        // if we got a file and it isn't already being watched
        if (data.name.length && !(data.name in watching) ) {
            path.exists(data.name, function(exists) {
              if (exists) {
                fs.watchFile(data.name, {interval: 50}, function(curr, prev) {
                  // send client notification of change if this file was modified and not just accessed
                  if (curr.mtime > prev.mtime) {
                    socket.emit("file changed", {file: curr, location: data.location, type : data.type, name: data.name});
                  }
                });
              } else {
                console.log(data.name, "can't find");
              }

            });
            
            // add to array of watched files
            watching.push(data.name);
        }
    });
});


var io = require("socket.io").listen(7201);
var fs = require("fs");

io.sockets.on('connection', function(socket) {
        socket.emit('news', {hello : 'world'});
        
        var watching = [];
        
        socket.on('watchfile', function(data) {
            if (data.name.length && !(data.name in watching) ) {
              fs.watchFile(data.name, {interval: 50}, function(curr, prev) {
                if (curr.mtime > prev.mtime) {
                  socket.emit("file changed", {file: curr, location: data.location, type : data.type, name: data.name});
                }
              });
              
              watching.push(data.name);
            }
        });
});


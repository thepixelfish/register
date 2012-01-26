var onHeroku = (typeof process.env.port !== 'undefined');

if(onHeroku){
  dbString = "mongodb://heroku:edgecase@staff.mongohq.com:10092/app2630624";
  port     = process.env.PORT;
} else {
  dbString = "localhost:27017/crb_register";
  port     = 3000;
}

var express  = require('express');
var stylus   = require('stylus');
var mongo    = require('mongoskin');
var db       = mongo.db(dbString);
var coll     = db.collection('entries');
var routes   = require('./routes');
var app      = module.exports = express.createServer();
var io       = require('socket.io').listen(app);
var password = "crb!";

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(require("stylus").middleware({
    src: __dirname + "/public",
    compress: true
  }));
});

if(onHeroku){
  // Force long polling
  io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);
  });
}

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
  coll.find({old: false}).toArray(function(error, entries){
    var data = JSON.stringify(entries);
    if(data === ""){ data = []; }
    res.render('index.jade', {length: password.length, entries: data});
  });
});

app.post('/unlock', function(req, res){
  res.send(req.param('code') === password);
});

// Sockets

io.sockets.on('connection', function(socket){
  var updateCount = function(){
    coll.count({old: false}, function(err, count){
      io.sockets.emit('updatedEntryCount', count);
    });
  }

  updateCount();

  socket.on('submitEntry', function(data){
    data['old'] = false;
    coll.insert(data);
    updateCount();
    io.sockets.emit('newEntryPosted', data);
  });

  socket.on('consumeEntries', function(){
    coll.update({old: false}, {$set: {old: true}}, {multi: true});
    updateCount();
    io.sockets.emit('clearEntries');
  });

  socket.on('winnerChosen', function(data){
    coll.update({old: false}, {$set: {winner: false}}, {multi: true}); // reset winner
    coll.update({old: false, email: data.email}, {$set: {winner: true}}); // set winner
    io.sockets.emit('showWinner', data.row);
  });
});

app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

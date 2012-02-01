# Bootstrapping

onHeroku = process.env.PORT

if onHeroku
  dbString = "mongodb://heroku:edgecase@staff.mongohq.com:10066/app2636005"
  port     = process.env.PORT
else
  dbString = "localhost:27017/crb_register"
  port     = 3000

express   = require('express')
stylus    = require('stylus')
mongo     = require('mongoskin')
coffee    = require('coffee-script')
db        = mongo.db(dbString)
coll      = db.collection('entries')
routes    = require('./routes')
app       = module.exports = express.createServer()
io        = require('socket.io').listen(app)
coffeeDir = __dirname + '/coffee'
publicDir = __dirname + '/public'
cssDir    = publicDir + '/stylesheets'
# jsDir     = publicDir + '/javascripts'
password  = "crb!"


# Configuration

app.configure ->
  app.set('views', __dirname + '/views')
  app.set('view engine', 'jade')
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(express.favicon(publicDir + '/favicon.ico', { maxAge: 2592000000 }))
  app.use(express.compiler({src: coffeeDir, dest: publicDir, enable: ['coffeescript']}))
  app.use(stylus.middleware({src: publicDir, compress: true}))
  app.use express.static(publicDir)

if onHeroku
  io.configure ->
    io.set("transports", ["xhr-polling"])
    io.set("polling duration", 10)

app.configure 'development', ->
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))

app.configure 'production', ->
  app.use(express.errorHandler())


# Routes

app.get '/', (req, res) ->
  coll.find({old: false}).toArray (error, entries) ->
    data = JSON.stringify(entries)
    res.render('index.jade', {length: password.length, entries: data})

app.post '/unlock', (req, res) ->
  res.send(req.param('code') is password)



# Database

insertEntry = (data, callback) ->
  data.old = false
  coll.insert data, ->
    updateCount()
    callback()

consumeEntries = (callback) ->
  coll.update {old: false}, {$set: {old: true}}, {multi: true}, ->
    updateCount()
    callback()

setWinner = (data, callback) ->
  clearWinner ->
    coll.update {old: false, email: data.email}, {$set: {winner: true}}, ->
      callback()

clearWinner = (callback) ->
  coll.update {old: false}, {$set: {winner: false}}, {multi: true}, ->
    callback()

updateCount = ->
  coll.count {old: false}, (err, count) ->
    io.sockets.emit('updatedEntryCount', count)
    io.sockets.emit('updateProgressBar', (count / 30) * 100)


# Sockets

io.sockets.on 'connection', (socket) ->
  updateCount()

  socket.on 'submitEntry', (data) ->
    insertEntry data, ->
      io.sockets.emit('newEntryPosted', data)

  socket.on 'consumeEntries', ->
    consumeEntries ->
      io.sockets.emit('clearEntries')

  socket.on 'winnerChosen', (data) ->
    setWinner data, ->
      io.sockets.emit('showWinner', data)

  socket.on 'winnerCleared', ->
    clearWinner ->
      io.sockets.emit('hideWinner')


app.listen(port)
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env)

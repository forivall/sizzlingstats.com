
/**
 * Module dependencies.
 */

var cluster = require('cluster')
  , express = require('express')
  , app = module.exports = express()
  , http = require('http')
  , server = http.createServer(app)
  , npid = require('./lib/pid')
  , async = require('async')
  , sass = require('node-sass')
  , mongoose = require('mongoose')
  , everyauth = require('everyauth')
  , request = require('request')
  , cfg = require('config').cfg
  , secrets = require('config').secrets
  , airbrake = require('airbrake').createClient(secrets.airbrake_key, null, cfg.airbrake_host)
  , Player = require('./models/player');
require('colors');
// var db = mongoose.createConnection('localhost', 'sizzlingstats');
mongoose.connect(cfg.mongo_url);

/**
 * Exit cleanup stuff.
 */
var gracefullyExiting = false;

// Create a pidfile with the worker's ID and pid
try {
  npid.create(__dirname + '/worker' +
            (cluster.isWorker ? cluster.worker.id : '') +
            '-' + process.pid + '.pid', true);
} catch (err) {
  console.log(err);
  process.exit(1);
}

// If gracefully exiting, prevent http keep-alive
app.use(function (req, res, next) {
  if (gracefullyExiting) {
    res.set('Connection', 'close');
  }
  next();
  // res.send(502, 'The server is in the process of restarting.');
});

if (cluster.isWorker) {
  process.on('message', function (message) {
    if (message !== 'shutdown') { return; }
    console.log('Worker', cluster.worker.id, 'is gracefully exiting...');
    gracefulExit();
  });
}
process.on('SIGTERM', gracefulExit);
process.on('SIGINT', exit);
// process.on('SIGKILL', exit); // Breaks in node v0.10.x
// This is just for removing the pidfile when nodemon is doing its thing
process.once('SIGUSR2', function() {
  npid.remove(__dirname + '/worker' + (cluster.isWorker ? cluster.worker.id : '') +
              '-' + process.pid + '.pid');
  process.nextTick(function() {
    process.kill(process.pid, 'SIGUSR2');
  });
});

function gracefulExit () {
  gracefullyExiting = true;

  // TODO: Close socket.io connections gracefully, somehow

  // Timeout idle connections after 3 seconds
  // server.on('connection', function(socket) {
  //   socket.setTimeout(3*1000);
  // });

  server.close(function() {
    mongoose.disconnect(function() {
      exit(0);
    });
  });

  // Forcefully shutdown after 6 seconds
  setTimeout(function () {
    console.error("Could not close connections in time, forcefully shutting down");
    exit(1);
  }, 6*1000);
}

function exit (code) {
  process.nextTick(function() {
    process.exit(code || 0);
  });
}


/**
 * Everyauth Configuration
 */

// Wait 8 seconds per step before timing out (default 10)
everyauth.everymodule.moduleTimeout(8000);
everyauth.everymodule.findUserById( function (req, userId, callback) {
  Player.findById(userId, callback);
  // callback has the signature, function (err, user) {...}
});
everyauth.everymodule.handleLogout( function (req, res) {
  delete req.session.auth; // This is what req.logout() does
  var that = this;
  req.session.destroy(function() {
    that.redirect(res, that.logoutRedirectPath());
  });
});
everyauth.steam
  .myHostname( cfg.address )
  .findOrCreateUser( function (session, openIdUserAttributes) {
    var promise = this.Promise();
    var steamId, numericId;
    try {
      numericId = openIdUserAttributes.claimedIdentifier.split('/').slice(-1)[0];
      if (!numericId) throw new Error('No steamid64???');
    } catch (e) {
      promise.fail(e);
      return promise;
    }
    steamId = Player.numericIdToSteamId(numericId);
    Player.findById(steamId, function(err, player) {
      if (err) {
        console.log('Error looking up player '+steamId, err);
        console.trace(err);
        return promise.fail(err);
      }
      if (player) {
        // Update the player's info on login
        // Instead of just retrieving old info

        Player.getSteamApiInfo([numericId], function(err, steamInfo) {
          if (err) return promise.fail(err);

          player.name = steamInfo[0].personaname;
          player.avatar = steamInfo[0].avatar;
          player.updated = new Date();
          if (steamInfo[0].loccountrycode) {
            player.country = steamInfo[0].loccountrycode;
          }

          player.save(function(err) {
            if (err) {
              console.log('Error saving player', err);
              console.trace(err);
              return promise.fail(err);
            }
            promise.fulfill(player);
          });
        });
      } else {
        Player.getSteamApiInfo([numericId], function(err, steamInfo) {
          if (err) return promise.fail(err);

          var newPlayer = new Player({
            _id: steamId
          , numericid: numericId
          , name: steamInfo[0].personaname
          , avatar: steamInfo[0].avatar
          , updated: new Date()
          });
          if (steamInfo[0].loccountrycode) {
            newPlayer.country = steamInfo[0].loccountrycode;
          }

          newPlayer.save(function(err) {
            if (err) {
              console.log('Error saving new player', err);
              console.trace(err);
              return promise.fail(err);
            }
            promise.fulfill(newPlayer);
          });
        });
      }
      // session.save();
    });
    return promise;
  })
  .moduleErrback( function (err) {
    console.log( 'EVERYAUTH ERROR:', err);
    console.trace(err);
  })
  .redirectPath('/');
everyauth.debug = false;


/**
 * Express Configuration
 */

// app.use(function(req, res, next) {
//   console.log('Worker' + cluster.worker.id + 'is doing something');
//   next();
// });

app.set('trust proxy', true);
app.use(express.limit('200kb'));
app.use(express.favicon(__dirname + '/public/img/favicon.png'
                      , { maxAge: 14 * 24 * 60 * 60 * 1000 } ));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {
  layout: false
});
app.use(express.bodyParser());
app.use(express.methodOverride());


// Sessions

// app.store = new express.session.MemoryStore;
var RedisStore = require('connect-redis')(express);
app.store = new RedisStore({
  prefix: cfg.session_prefix
, host: cfg.redis_host
, port: cfg.redis_port
, db: cfg.redis_db
, pass: cfg.redis_password
});

app.use(express.cookieParser());
app.use(express.session({
  proxy: true
, store: app.store
, secret: secrets.session
, cookie: {
    path: '/'
  , httpOnly: true
  // cookies expire every 14 days
  , maxAge: 14 * 24 * 60 * 60 * 1000
  }
}));
app.use(everyauth.middleware());


// Asset Management

var assetManager = require('connect-assetmanager')({
  js: {
    route: /\/js\/all-[a-z0-9]+\.js/
  , path: __dirname + '/public/js/'
  , dataType: 'javascript'
  , debug: app.get('env') === 'development'
  , stale: app.get('env') === 'production'
  , preManipulate: {
      '^': [
        function(src, path, index, isLast, callback) {
          callback(src.replace(/#socketIoHostname#/g, cfg.socket_io_address));
        }
      , function(src, path, index, isLast, callback) {
          callback(src.replace(/#socketIoPort#/g, cfg.socket_io_port));
        }
      // , function(src, path, index, isLast, callback) {
      //     if (/\.coffee$/.test(path)) {
      //       callback(coffee.compile(src));
      //     } else {
      //       callback(src);
      //     }
      //   }
      ]
    }
  , files: cfg.devScripts.concat([ // order matters here
      'lib/modernizr.js'
    , 'lib/typeahead.js'

    , 'lib/foundation/foundation.js'
    , 'lib/foundation/foundation.tooltip.js'
    , 'lib/foundation/foundation.topbar.js'

    , 'lib/foundation/app.js'
    , 'app.js'
    , 'services.js'
    , 'controllers.js'
    , 'controller-stats.js'
    , 'controller-player.js'
    , 'controller-settings.js'
    , 'directive-stats.js'
    , 'directive-typeahead.js'
    // , '*'
    ])
  },
  css: {
    route: /\/css\/all-[a-z0-9]+\.css/
  , path: __dirname + '/public/css/'
  , watchPath: true
  , dataType: 'css'
  , debug: app.get('env') === 'development'
  , stale: app.get('env') === 'production'
  , preManipulate: {
      '^': [
        function(src, path, index, isLast, callback) {
          if (/\.scss$/.test(path)) {
            sass.render({
              file: path
            , success: callback
            , error: callback
            });
          } else {
            callback(src);
          }
        }
      ]
    }
  , files: [ // order matters here
      // 'foundation.css'
      'app.scss'
    , 'typeahead.css'
    , 'sizzlingstats.scss'
    ]
  }
});
app.use(assetManager);
// app.helpers({ assetManager: assetManager });
app.locals.assetManager = assetManager;
app.use(express.staticCache());

if (app.get('env') === 'development') {
  app.use(express.static(__dirname + '/public'));
} else {
  app.use(express.static(__dirname + '/public', {maxAge: 24 * 60 * 60 * 1000}));
}

app.use(app.router);

if (app.get('env') !== 'production') {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
} else {
  // Airbrake
  app.use(function(err, req, res, next) {
    airbrake.expressHandler().apply(this, arguments);
  });
  // Error handler
  app.use(function(err, req, res, next) {
    res.set('Content-Type', 'text/plain');
    res.send(500, "that's a meatshot" );
  });
}

// Routes
require('./routes')(app);

// Hook Socket.io into Express
app.io = require('socket.io')(server);
// Redis adapter for socket.io
var socketRedisAdapter = require('socket.io-redis')
  , socketRedis = require('socket.io-redis/node_modules/redis')
  , pub = socketRedis.createClient(cfg.redis_port, cfg.redis_host)
  , sub = socketRedis.createClient(cfg.redis_port, cfg.redis_host);
async.applyEach([ pub.select.bind(pub), sub.select.bind(sub) ]
                , cfg.redis_db, function (err) {
  if (err) {
    console.log(err);
    console.trace(err);
    return false;
  }
  app.io.adapter( socketRedisAdapter({pubClient: pub, subClient: sub}) );

  var socket = require('./routes/socket')(app);
});

/**
 * Check status of Elasticsearch server
 */
request.get(cfg.elasticsearch_url + '/_status', function(err, res, body) {
  if (err || res.statusCode !== 200) {
    return console.log('WARNING: Elasticsearch index "sizzlingstats" not found.');
  }
  console.log('Elasticsearch index "sizzlingstats" found.');
});


module.exports = server;

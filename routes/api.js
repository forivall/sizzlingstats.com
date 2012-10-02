/*
 * Serve JSON to our AngularJS client
 */
var mongoose = require('mongoose');
var crypto = require('crypto');
var cfg = require('../cfg/cfg');
var secrets = require('../cfg/secrets');
var Stats = require('../models/stats');
var Match = require('../models/match');
var Counter = require('../models/counter');
var Session = require('../models/session');
var Player = require('../models/player');

// GET

exports.stats = function(req, res) {
  var id = req.params.id;
  Stats.findById(id, function(err, stats) {
    if (err || !stats) {
      console.log(err);
      return res.json(false);
    }

    // Build an array of steamids and retrieve those players
    var steamids = [];
    stats.players.forEach(function(player) {
      steamids.push(player.steamid);
    });

    Player.find( { _id: { $in : steamids } }).exec(function(err, players) {
      if (err) {
        console.log(err);
        return res.json(false);
      }

      var playerdata = {};
      players.forEach(function(player) {
        playerdata[player._id] = {
          avatar: player.avatar,
          numericid: player.numericid,
          country: player.country
        };
      });
      res.json({ stats: stats, playerdata: playerdata });
    });

  });
};

exports.matches = function(req, res) {
  Match.find({}).sort({_id:-1}).limit(10).exec(function(err, matches) {
    if (err || !matches) {
      return res.json(false);
    }
    res.json({ matches: matches });
  });
};

// POST

exports.addStats = function(req, res) {
  // Change this later to reject requests that
  // exceed a certain size

  // Control flow:
  // 1. Check header for api version
  if (!req.body.stats || req.headers.sizzlingstats !== 'v0.1') {
    return res.json(false);
  }
  
  // 2. Check header for sessionid, generate session if needed.
  // If sessionid is supplied, validate it.
  // 3. Then insert stats into database.
  var sessionid = req.headers.sessionid;
  var ip = req.connection.remoteAddress;
  var matchid;
  if (!sessionid) {
    // We probably need some more/better information in the hmac
    var date = Date.now();
    var hmac = crypto.createHmac('sha1',secrets.statssession);
    hmac.update(ip + date);
    sessionid = hmac.digest('hex');

    // Get matchid
    Counter.findOneAndUpdate({ "counter" : "matches" },
                             { $inc: {next:1} },
                             function(err, matchCounter) {
      if (err || !matchCounter) {
        console.log(err);
        return res.json(false);
      }
      matchid = matchCounter.next;
      res.setHeader('matchurl', cfg.hosturl + 'match/' +matchid);
      res.setHeader('sessionid', sessionid);

      // 3. Create new session, match, and stats documents
      new Session({
        _id: sessionid,
        matchid: matchid,
        ip: ip,
        timeout: date + cfg.statsSessionTimeout }).save(function(e) {
        if (e) {
          console.log(e);
          return res.json(false);
        }

        new Match({
          _id: matchid,
          hostname: req.body.stats.hostname,
          bluname: req.body.stats.bluname,
          redname: req.body.stats.redname }).save(function(e) {
          if (e) {
            console.log(e);
            return res.json(false);
          }

          var stats = req.body.stats;
          stats.round = 0;
          stats._id = matchid;
          stats.created = new Date();

          new Stats(stats).save(function(e) {
            if (e) {
              console.log(e);
              return res.json(false);
            }
            return res.json(true);
          }); // End Stats.save()
        }); // End Match.save()
      }); // End Session.save()
    }); // End Counter.findOneAndUpdate()
  } else {
    // Validate sessionid
    Session.findById(sessionid, function(err, session) {
      if (err) {
        console.log(err);
        return res.json(false);
      }
      if (!session || ip !== session.ip) return res.json(false);

      // The request is validated, now we have to append the new data to the old
      matchid = session.matchid;
      Stats.findById(matchid, function(err, stats) {
        if (err || !stats) {
          console.log(err);
          return res.json(false);
        }

        stats.appendStats(req.body.stats, function(err) {
          if (err) {
            console.log(err);
            return res.json(false);
          }
          res.json(true);
        });
      }); // end Stats.findById()
    }); // end Session.findById()
  } // end else
};
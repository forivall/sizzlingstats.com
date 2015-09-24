chai.factory 'stats',
  map: "cp_badlands"
  hostname: "mocks r0"
  apikey: "e04c22ef-a86b-4511-a47f-e136c38c10da"
  bluname: "BluName"
  redname: "RedName"
  players: [
    { steamid: "[U:1:172288]",   team: 2, name: "Cigar",       mostplayedclass: 1 }
    { steamid: "[U:1:34520467]", team: 3, name: "SteveC",      mostplayedclass: 1 }
    { steamid: "[U:1:32195981]", team: 2, name: "foster",      mostplayedclass: 1 }
    { steamid: "[U:1:14845406]", team: 3, name: "binarystar!", mostplayedclass: 1 }
    { steamid: "[U:1:35980414]", team: 2, name: "dy<br>dx",    mostplayedclass: 3 }
    { steamid: "[U:1:22059901]", team: 3, name: "rando",       mostplayedclass: 3 }
    { steamid: "[U:1:28707326]", team: 2, name: "Sizzling",    mostplayedclass: 3 }
    { steamid: "[U:1:19214517]", team: 3, name: "Dave__AC",    mostplayedclass: 3 }
    { steamid: "[U:1:38223093]", team: 2, name: "drdonutman",  mostplayedclass: 4 }
    { steamid: "[U:1:42549092]", team: 3, name: "Gobiner",     mostplayedclass: 4 }
    { steamid: "[U:1:18076652]", team: 2, name: "Trekkie",     mostplayedclass: 5 }
    { steamid: "[U:1:10972748]", team: 3, name: "eXtine",      mostplayedclass: 5 }
    { steamid: "[U:1:58123372]", team: 1, name: "DontSeeMe",   mostplayedclass: 0 } ]
  chats: [{
    steamid: "[U:1:10972748]",
    isTeam: 0,
    time: 402,
    message: "\"Yaaaaooooooooooooooooooo!!!!\""
  }]

chai.factory 'update', {
  "stats": {
    "teamfirstcap": 2,
    "bluscore": 0,
    "redscore": 1,
    "roundduration": 78,
    "players": [{
      "name": "Dv8 | reno",
      "steamid": "[U:1:115519891]",
      "ip": "108.38.36.135:27005",
      "mostplayedclass": 1,
      "playedclasses": 17,
      "team": 2,
      "kills": 0,
      "killassists": 0,
      "deaths": 0,
      "captures": 3,
      "defenses": 0,
      "suicides": 0,
      "dominations": 0,
      "revenge": 0,
      "buildingsbuilt": 0,
      "buildingsdestroyed": 0,
      "headshots": 0,
      "backstabs": 0,
      "healpoints": 0,
      "invulns": 0,
      "teleports": 0,
      "damagedone": 68,
      "crits": 2,
      "resupplypoints": 0,
      "bonuspoints": 0,
      "points": 6,
      "healsreceived": 0,
      "medpicks": 0,
      "ubersdropped": 0,
      "overkillDamage": 0
    }, {
      "name": "forivall ₰",
      "steamid": "[U:1:35537041]",
      "ip": "24.85.183.135:27005",
      "mostplayedclass": 3,
      "playedclasses": 4,
      "team": 2,
      "kills": 0,
      "killassists": 0,
      "deaths": 0,
      "captures": 0,
      "defenses": 0,
      "suicides": 0,
      "dominations": 0,
      "revenge": 0,
      "buildingsbuilt": 0,
      "buildingsdestroyed": 0,
      "headshots": 0,
      "backstabs": 0,
      "healpoints": 0,
      "invulns": 0,
      "teleports": 0,
      "damagedone": 0,
      "crits": 0,
      "resupplypoints": 0,
      "bonuspoints": 0,
      "points": 0,
      "healsreceived": 0,
      "medpicks": 0,
      "ubersdropped": 0,
      "overkillDamage": 0
    }, {
      "name": "SizzlingCalamari",
      "steamid": "[U:1:28707326]",
      "ip": "192.168.1.200:27006",
      "mostplayedclass": 1,
      "playedclasses": 1,
      "team": 3,
      "kills": 0,
      "killassists": 0,
      "deaths": 1,
      "captures": 0,
      "defenses": 0,
      "suicides": 1,
      "dominations": 0,
      "revenge": 0,
      "buildingsbuilt": 0,
      "buildingsdestroyed": 0,
      "headshots": 0,
      "backstabs": 0,
      "healpoints": 0,
      "invulns": 0,
      "teleports": 0,
      "damagedone": 0,
      "crits": 4,
      "resupplypoints": 0,
      "bonuspoints": 0,
      "points": 0,
      "healsreceived": 0,
      "medpicks": 0,
      "ubersdropped": 0,
      "overkillDamage": 0
    }],
    "chats": [{
      "steamid": "[U:1:28707326]",
      "isTeam": 0,
      "time": 402,
      "message": "\"now you cap\""
    }]
  }
}

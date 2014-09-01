var http = require('http');
var express = require('express');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var cache = {};
var XLS = require('xlsjs');
var bodyParser = require('body-parser')
var Store = require("jfs");
require('array.prototype.find');
var db = new Store("db");
var leaguesArray = [];
var userHash = {};
var results = {}
db.get("results", function(err, obj){
    if(obj){
        results = obj
    }
})
var app = express();
app.use(bodyParser.json());

function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200,
        {"content-type": mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function (exists) {
            if (exists) {
                fs.readFile(absPath, function (err, data) {
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                });
            } else {
                send404(response);
            }
        });
    }
}

function saveLeagueFile(req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {
        res.writeHead(200, {'content-type': 'text/plain'});
        fs.createReadStream(files.file.path).pipe(fs.createWriteStream('leagues.xls'));
    });

    return;
}

function loadLeaguesInArray() {
    leaguesArray = []
    userHash = {}
    var wb = XLS.readFile('leagues.xls');
    var ws = wb.Sheets[wb.SheetNames[0]];
    var csv = XLS.utils.sheet_to_csv(ws).split(",,");
    for (var i = 0; i < csv.length; i += 2) {
        var divisionIndex = i / 2
        var division = csv[i].replace(/\\n/g, '').trim();
        if (division == "") {
            continue
        }
        leaguesArray.push({"id": divisionIndex, "name": division, "players": []})
        var playersString = csv[i + 1]
        if (!(!!playersString)) {
            continue
        }
        var players = csv[i + 1].split("\n")
        for (var j = 0; j < players.length; j++) {
            var values = players[j].split(",")
            if (values[0] == "") {
                continue
            }
            var id = i + "" + j
            leaguesArray[divisionIndex]["players"].push({"id": id, "name": values[0], "email": values[1], "phone": values[2]})
            userHash[values[1]] = {"id": id, "name": values[0], "email": values[1], "league": divisionIndex}
        }
    }
}

function serveLeagues(req, res) {
    if (leaguesArray.length == 0) {
        loadLeaguesInArray();
    }
    res.end(JSON.stringify({"leagues": leaguesArray}));
}

function serveLeague(req, res) {
    if (leaguesArray.length == 0) {
        loadLeaguesInArray();
    }
    res.end(JSON.stringify({"leagues": leaguesArray[req.params.league_id]}));
}

function findUserForEmail(email) {
    if (Object.getOwnPropertyNames(userHash).length == 0) {
        loadLeaguesInArray();
    }
    return userHash[email];
}


function saveResult(result) {
	function saveResultForEmail(email, email2, result){
	    if (!results[email]) {
	        results[email] = []
	    }
		var resultId = email + email2
		var existent = results[email].find(function(result) {
			return result.id == resultId;
		});
		
		if(existent){
		  existent.result = result.result
		}else{
	      result.id = resultId
	      results[email].push(result)
	    }
	    db.save("results", results, function(err){
          console.log('Error saving results ' + err);
	    });	
	}
	
	function invertSet(set){
		var games = set.split("-")
		var game1 = games[0].trim()
		var game2 = games[1].trim()
		return game2 + "-" + game1
	}
	
	function invertResult(result) {
		// poor man's clone
	  result = JSON.parse(JSON.stringify(result));
	  var sets = result.result.split("|")
	  result.result = invertSet(sets[0]) + "  |  " + invertSet(sets[1]) + "  |  " + invertSet(sets[2])  
      return result
	}
	
	saveResultForEmail(result.email1, result.email2, result)
	saveResultForEmail(result.email2, result.email1, invertResult(result))
	
}

function getResults(player_email) {
    if(!results[player_email]){
        return []
    }
    return results[player_email]
}

app.get('/', function (req, res) {
    var filePath = 'index.html';
    serveStatic(res, cache, './' + filePath);
});

app.get('/upload', function (req, res) {
    saveLeagueFile(req, res);
});

app.get('/leagues', function (req, res) {
    serveLeagues(req, res);
});

app.get('/leagues/:league_id', function (req, res) {
    serveLeague(req, res);
});

app.get('/users/:user_id', function (req, res) {
    var user = findUserForEmail(req.params.user_id)
    if (!user) {
        user = {
            "name": "none",
            "league": "none",
            "email": "none",
            "id": "none"
        }
    }
    res.end(JSON.stringify({"user": user}));
});

app.post('/results', function (req, res) {
    saveResult(req.body.result)
    res.end(JSON.stringify({"result": {"id": 1}}))
});

app.get('/results', function (req, res) {
    res.end(JSON.stringify({"results": getResults(req.query.player_email)}));
});

app.use(function (req, res) {
    var filePath = req.url;
    serveStatic(res, cache, './' + filePath);
});

app.listen(process.env.PORT || 3000);

console.log('Server running at http://localhost:' + (process.env.PORT || 3000));

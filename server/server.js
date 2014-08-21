var http = require('http');
var express = require('express');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var cache = {};
var XLS = require('xlsjs');
var leaguesArray = [];
var userHash = {};
var app = express();

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
        var divisionIndex = i/2
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

function serveLeagues(req, res){
    if(leaguesArray.length == 0){
      loadLeaguesInArray();
    }
    res.end(JSON.stringify({"leagues": leaguesArray}));
}

function findUserForEmail(email){
    if(Object.getOwnPropertyNames(userHash).length == 0){
        loadLeaguesInArray();
    }
    return userHash[email];
}

app.get('/', function(req, res){
    var filePath = 'index.html';
    serveStatic(res, cache, './' + filePath);
});

app.get('/upload', function(req, res){
    saveLeagueFile(req, res);
});

app.get('/leagues', function(req, res){
    serveLeagues(req, res);
});

app.get('/users/:user_id', function(req, res){
  var user = findUserForEmail(req.params.user_id)
  if(!user) {
    user = {
        "name": "none",
        "league": "none",
        "email": "none",
        "id": "none"
    }
  }
  res.end(JSON.stringify({"user": user}));
});

app.use(function(req, res){
    var filePath = req.url;
    serveStatic(res, cache, './' + filePath);
});

app.listen(3000);

console.log('Server running at http://localhost:3000/');

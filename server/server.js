var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var cache = {};
var XLS = require('xlsjs');

var leagues = {}

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
        var wb = XLS.readFile(files.file.path);
        var ws = wb.Sheets[wb.SheetNames[0]];
        var csv = XLS.utils.sheet_to_csv(ws).split(",,");
        for (var i = 0; i < csv.length; i += 2) {
            if (csv[i] == "") {
                continue
            }
            var division = csv[i].replace(/\\n/g, '').trim();
            leagues[division] = []
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
                leagues[division].push({"id": id, "name": values[0], "email": values[1], "phone": values[2]})
            }
        }
        res.end(JSON.stringify(leagues));
    });

    return;
}

function serveLeagues(req, res){
    res.end(JSON.stringify({"league": leagues["Premier Division"]}));
}


http.createServer(function (req, res) {
    var filePath = null
    if (req.url == '/') {
        filePath = 'index.html';
        serveStatic(res, cache, './' + filePath);
    } else if (req.url == '/upload') {
        saveLeagueFile(req, res)
    } else if (req.url == '/leagues') {
        serveLeagues(req, res)
    }  else {
        filePath = req.url;
        serveStatic(res, cache, './' + filePath);
    }
}).listen(3000);
console.log('Server running at http://localhost:3000/');

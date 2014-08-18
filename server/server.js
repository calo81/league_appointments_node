var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var cache = {};
var leagues = []

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
        fs.readFile(files.file.path, function (err, data) {
            res.end(data);
        });
    });

    return;
}


http.createServer(function (req, res) {
    var filePath = null
    if (req.url == '/') {
        filePath = 'index.html';
        serveStatic(res, cache, './' + filePath);
    } else if (req.url == '/upload') {
        saveLeagueFile(req, res)
    } else {
        filePath = req.url;
        serveStatic(res, cache, './' + filePath);
    }
}).listen(3000);
console.log('Server running at http://localhost:3000/');

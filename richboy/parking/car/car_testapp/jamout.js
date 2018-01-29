var jserver = require('jamserver')(true);
var JAMLogger = jserver.JAMLogger;
var JAMManager = jserver.JAMManager;
var JAMBroadcaster = jserver.JAMBroadcaster;
const {Flow, ParallelFlow, PFlow, InFlow, OutFlow} = require('flows.js')(JAMManager);
PFlow.useCores(require('os').cpus().length);
var jamlib = jserver.jamlib;
var jnode = jserver.jnode;
var jsys = jserver.jsys;
var http = require('http');
var cbor = require('cbor');
var qs = require('querystring');
var path = require('path');
var mime = require('mime');
var fs = require('fs');
var express, socket, clientSocket, carID;
var request = new JAMLogger(JAMManager, "request");
jnode.addLogger("request", request.getMyDataStream());
var carRequestOut = new OutFlow('carRequestOut', request);
var allocCarAssignIn = new InFlow("allocating", "allocResponseOut");
var resp = new JAMBroadcaster('resp', JAMManager);
jnode.addBroadcaster("resp", resp);
var currentSpot, tempSpot;
jnode.jcond.set('isDevice', { source: 'eval(jcondContext("sys.type") == "device")', code: 0, cback: null, bcasts: [] });
jnode.jcond.set('isFog', { source: 'eval(jcondContext("sys.type") == "fog")', code: 2, cback: null, bcasts: [] });

function getCarID() {
return jnode.machSyncExec("getCarID", [  ], "jcond.get('isDevice').source", 0, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
function launch() {
jnode.machAsyncExec("launch", [  ], "jcond.get('isDevice').source", 0, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
console.log("Calling launch..........");
launch();
carRequestOut.start();
allocCarAssignIn.setTerminalFunction(function (data) {
resp.broadcast(data);
});
function park(postcode,slot) {
if(typeof postcode === "function") { postcode = postcode.name; }
if(typeof slot === "function") { slot = slot.name; }
jnode.remoteAsyncExec("park", [ postcode,slot ], "true", 0, "[]", "");
}

function callgetCarID() {
if (!carID) {
carID = ("car" + new Date().getTime() + Math.random()).replace(/\./g, "");
}
return carID;

jnode.poplevel();
}
function calllaunch() {
console.log("\n\n --------------- GOT INSIDE HERE  ---------- \n\n");
if (!carID) {
carID = ("car" + new Date().getTime() + Math.random()).replace(/\./g, "");
}
express = (require('express'))();
var server = require('http').createServer(express);
socket = require('socket.io')(server);
socket.on('connection', function (client) {
clientSocket = client;
console.log("client connected");
client.emit("id", {
carID: carID,
currentSpot: currentSpot
});
client.on('reconnect', function () {
console.log("client reconnected");
client.emit("id", {
carID: carID,
currentSpot: currentSpot
});
});
client.on('disconnect', function () {
console.log("client disconnected");
client.emit("id", {
carID: carID,
currentSpot: currentSpot
});
});
client.on('request', function (data) {
request.log(data);
});
client.on('accept', function (data) {
currentSpot = tempSpot;
park(currentSpot.postcode, currentSpot.label);
request.log(data);
});
client.on('reject', function (data) {
tempSpot = null;
request.log(data);
});
client.on('leave', function (data) {
currentSpot = null;
request.log(data);
});
});
server.listen(JAMManager.port - 0 + 1);
express.get("/", function (req, res) { return res.sendFile(__dirname + "/car.html") });
express.get("/*", function (req, res) { return res.sendFile(__dirname + req.url) });
resp.addHook(function (pack) {
if (pack.origin === "parent") {
var message = pack.message;
if (message.carID != carID) {
return;
}
if (message.messageType == 2) {
clientSocket.emit("response", message);
return;
}
if (message.isPreferred == 1) {
currentSpot = message;
park(message.postcode, message.label);
clientSocket.emit("response", message);
} else {
tempSpot = message;
clientSocket.emit("response", message);
}
}
});

jnode.poplevel();
}
var mbox = {
"functions": {
"getCarID": callgetCarID,
"launch": calllaunch,
},
"signatures": {
"getCarID": "",
"launch": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

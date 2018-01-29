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
var temp = new JAMLogger(JAMManager, "temp");
jnode.addLogger("temp", temp.getMyDataStream());
var pos = new JAMLogger(JAMManager, "pos");
jnode.addLogger("pos", pos.getMyDataStream());
var io = require('socket.io-client');
var socket = io('http://localhost:3000');
var jvc = 0; setInterval(() => {for (i = 0; i < temp.size(); i++) if (temp[i] !== undefined && temp[i].lastValue() != null) socket.emit('newDataPoint', {x: jvc++, y: temp[i].lastValue(), gateIndex: 0, id: "temp"});}, 500);
var jvc = 0; setInterval(() => {for (i = 0; i < pos.size(); i++) if (pos[i] !== undefined && pos[i].lastValue() != null) socket.emit('newDataPoint', {x: jvc++, y: pos[i].lastValue(), gateIndex: 0, id: "pos"});}, 500);
var mbox = {
"functions": {
},
"signatures": {
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

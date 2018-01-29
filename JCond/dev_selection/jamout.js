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
var x = new JAMBroadcaster('x', JAMManager);
jnode.addBroadcaster("x", x);
var id = new JAMLogger(JAMManager, "id");
jnode.addLogger("id", id.getMyDataStream());
jnode.jcond.set('fogonly', { source: 'eval(jcondContext("sys.type") == "fog")', code: 2, cback: null, bcasts: [] });
jnode.jcond.set('devonly', { source: 'eval(jcondContext("sys.type") == "device")', code: 1, cback: null, bcasts: [] });
jnode.jcond.set('matchid', { source: 'eval(jcondContext("bc.x.getLastValue()") == lgg.id.lastValue())', code: 16, cback: null, bcasts: ["x"] });

var idlogger = id.getMyDataStream();
var machids = [];
var fidcounter = 1000;
function getMyId() {
return jnode.machSyncExec("getMyId", [  ], "jcond.get('fogonly').source", 2, "jcond.get('fogonly').bcasts", "jcond.get('fogonly').cback");
}
var myid = 0;
var gotmyid = false;
function putIdCback(msg) {
gotmyid = true;
if (msg !== undefined && msg !== "") {
myid = msg;
}
idlogger.log(myid, function (err) {
console.log("Error logging id", err);
});
}
function askforId() {
jnode.machAsyncExec("askforId", [  ], "jcond.get('devonly').source", 1, "jcond.get('devonly').bcasts", "jcond.get('devonly').cback");
}
function runAtDevice() {
jnode.machAsyncExec("runAtDevice", [  ], "jcond.get('devonly').source && jcond.get('matchid').source", 17, "jcond.get('devonly').bcasts", "jcond.get('devonly').cback");
}
function callMyDevice() {
jnode.machAsyncExec("callMyDevice", [  ], "jcond.get('fogonly').source", 2, "jcond.get('fogonly').bcasts", "jcond.get('fogonly').cback");
}
setInterval(function () {
console.log("Running J... ");
if (!gotmyid) {
askforId();
} else {
console.log("My id ..", myid);
}
callMyDevice();
}, 1000);
function call_get_myid(msg,putid) {
if(typeof msg === "function") { msg = msg.name; }
if(typeof putid === "function") { putid = putid.name; }
jnode.remoteAsyncExec("call_get_myid", [ msg,putid ], "true", 0, "[]", "");
}

function callgetMyId() {
console.log("getMyId called....");
machids.push(fidcounter);
return fidcounter++;

jnode.poplevel();
}
function callputIdCback(msg) {
gotmyid = true;
if (msg !== undefined && msg !== "") {
myid = msg;
}
idlogger.log(myid, function (err) {
console.log("Error logging id", err);
});

jnode.poplevel();
}
function callaskforId() {
if (!gotmyid) {
console.log("Asking for Id");
call_get_myid("asking for id", putIdCback);
}

jnode.poplevel();
}
function callrunAtDevice() {
console.log("Running at the device J..with ID = ", myid);
console.log("Type ", jsys.type);

jnode.poplevel();
}
function callcallMyDevice() {
if (machids.length > 0) {
console.log("Calling my device...");
x.broadcast(1000);
runAtDevice();
} else {
console.log("No device registered at the cloud...");
}

jnode.poplevel();
}
var mbox = {
"functions": {
"getMyId": callgetMyId,
"putIdCback": callputIdCback,
"askforId": callaskforId,
"runAtDevice": callrunAtDevice,
"callMyDevice": callcallMyDevice,
},
"signatures": {
"getMyId": "",
"putIdCback": "x",
"askforId": "",
"runAtDevice": "",
"callMyDevice": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

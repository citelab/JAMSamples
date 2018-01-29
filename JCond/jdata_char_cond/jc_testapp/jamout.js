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
var x = new JAMLogger(JAMManager, "x");
jnode.addLogger("x", x.getMyDataStream());
var y = new JAMBroadcaster('y', JAMManager);
jnode.addBroadcaster("y", y);
jnode.jcond.set('namecheck', { source: 'jcondContext("lgg.x.lastValue()") == bc.y.getLastValue()', code: 16, cback: null, bcasts: ["y"] });
jnode.jcond.set('cloudonly', { source: 'jcondContext("sys.type") == "cloud"', code: 4, cback: null, bcasts: [] });

function runTheProc(name) {
if(typeof name === "function") { name = name.name; }
jnode.machAsyncExec("runTheProc", [ name ], "jcond.get('namecheck').source", 16, "jcond.get('namecheck').bcasts", "jcond.get('namecheck').cback");
}
function runAtCloud() {
jnode.machAsyncExec("runAtCloud", [  ], "jcond.get('cloudonly').source", 4, "jcond.get('cloudonly').bcasts", "jcond.get('cloudonly').cback");
}
var xlogger = x.getMyDataStream();
var q = Math.random();
setInterval(function () {runAtCloud();
if (q < 0.3) {
xlogger.log("bucks");
} else {
if (q < 0.6) {
xlogger.log("bucks");
} else {
if (q < 0.9) {
xlogger.log("bucks");
} else {
xlogger.log("raptors");
}
}
}
console.log("Logged value ", xlogger.lastValue());
console.log("Broadcasted value ", y.getLastValue());
}, 1000);
function callrunTheProc(name) {
console.log("========= FOUND The " + name + "! ================");

jnode.poplevel();
}
function callrunAtCloud() {
console.log("Running at the cloud...");
y.broadcast("bucks");
runTheProc("bucks");

jnode.poplevel();
}
var mbox = {
"functions": {
"runTheProc": callrunTheProc,
"runAtCloud": callrunAtCloud,
},
"signatures": {
"runTheProc": "x",
"runAtCloud": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

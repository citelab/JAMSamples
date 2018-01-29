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
jnode.jcond.set('cloudonly', { source: 'jcondContext("sys.type") == "cloud"', code: 4, cback: null, bcasts: [] });
jnode.jcond.set('notcloud', { source: 'jcondContext("sys.type") != "cloud"', code: 3, cback: null, bcasts: [] });

function runAtCloud() {
jnode.machAsyncExec("runAtCloud", [  ], "jcond.get('cloudonly').source", 4, "jcond.get('cloudonly').bcasts", "jcond.get('cloudonly').cback");
}
function runElsewhere() {
jnode.machAsyncExec("runElsewhere", [  ], "jcond.get('notcloud').source", 3, "jcond.get('notcloud').bcasts", "jcond.get('notcloud').cback");
}
setInterval(function () {
runAtCloud();
runElsewhere();
}, 1000);
function callrunAtCloud() {
console.log("Running at the cloud...");
y.broadcast("something");

jnode.poplevel();
}
function callrunElsewhere() {
console.log('last value is ', y.getLastValue());

jnode.poplevel();
}
var mbox = {
"functions": {
"runAtCloud": callrunAtCloud,
"runElsewhere": callrunElsewhere,
},
"signatures": {
"runAtCloud": "",
"runElsewhere": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

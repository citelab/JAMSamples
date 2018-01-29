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
jnode.addLogger("x", x);
var y = new JAMBroadcaster('y', JAMManager);
jnode.addBroadcaster("y", y);
var z = new JAMBroadcaster('z', JAMManager);
jnode.addBroadcaster("z", z);
jnode.jcond.set('numcheck', { source: 'jcondContext("lg.x.lastValue() == undefined ? undefined : lg.x.lastValue()") < 15 && jcondContext("bc.z.getLastValue()") > 2', code: 16, cback: notequal, bcasts: ["z"] });
jnode.jcond.set('check2', { source: 'jcondContext("lg.x.lastValue() == undefined ? undefined : lg.x.lastValue()") < bc.y.getLastValue()', code: 16, cback: null, bcasts: ["y"] });

function pong() {
jnode.machAsyncExec("pong", [  ], "jcond.get('numcheck').source", 16, "jcond.get('numcheck').bcasts", "jcond.get('numcheck').cback");
}
var count = 0;
var indx = 0;
setInterval(function () {y.broadcast(count);
z.broadcast(indx);
console.log("Calling pong...count = ", count++, " indx = ", indx++);
pong();
}, 2000);
function notequal() {
return;
}
function callpong() {
console.log("================ Pong!");

jnode.poplevel();
}
var mbox = {
"functions": {
"pong": callpong,
},
"signatures": {
"pong": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

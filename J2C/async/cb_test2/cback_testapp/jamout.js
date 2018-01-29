var jserver = require('jamserver')(false);
const {Flow, ParallelFlow, PFlow} = require('flows.js')();
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
function q(m) {
console.log("Message from C", m);
}
var count = 0;
function getid() {
return jnode.machSyncExec("getid", [  ], "true", 0, "", "");
}
setInterval(function () {console.log("Sending...");
testcback("Message at JavaScript side", q);
}, 1000);
function testcback(m,cb) {
if(typeof m === "function") { m = m.name; }
if(typeof cb === "function") { cb = cb.name; }
jnode.remoteAsyncExec("testcback", [ m,cb ], "true", 0, "[]", "");
}

function callq(m) {
console.log("Message from C", m);

jnode.poplevel();
}
function callgetid() {
return ++count;

jnode.poplevel();
}
var mbox = {
"functions": {
"q": callq,
"getid": callgetid,
},
"signatures": {
"q": "x",
"getid": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

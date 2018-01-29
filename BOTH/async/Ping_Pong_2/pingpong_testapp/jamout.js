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
var count = 0;
function pingserver(penum) {
if(typeof penum === "function") { penum = penum.name; }
jnode.machAsyncExec("pingserver", [ penum ], "true", 0, "[]", "");
}
function regme(msg,cback) {
if(typeof msg === "function") { msg = msg.name; }
if(typeof cback === "function") { cback = cback.name; }
jnode.machAsyncExec("regme", [ msg,cback ], "true", 0, "[]", "");
}
function callpingserver(penum) {
console.log("Ping received from ", penum);

jnode.poplevel();
}
function callregme(msg,_1) {
cback = function(x) { jnode.remoteAsyncExecCB(_1, [x], "true", 0, [], ""); }
count = count + 1;
console.log("registration received from ", msg);
cback('' + count);

jnode.poplevel();
}
var mbox = {
"functions": {
"pingserver": callpingserver,
"regme": callregme,
},
"signatures": {
"pingserver": "n",
"regme": "ss",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

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
var devices = 1;
var labels = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8"];
var postcodes = ["H1N", "H1N", "H1N", "H1N", "H1N", "H1N", "H1N", "H1N"];
var addresses = ["No 1 parking zone, Montreal"];
var spot = new JAMLogger(JAMManager, "spot");
jnode.addLogger("spot", spot.getMyDataStream());
var spotFlow = spotFlowFunc(Flow.from(spot));
var sensingOut = new OutFlow('sensingOut', spotFlow);
var allocSensorIn = new InFlow("allocating", "allocSenseOut");
var assignment = new JAMBroadcaster('assignment', JAMManager);
jnode.addBroadcaster("assignment", assignment);
jnode.jcond.set('isFog', { source: 'eval(jcondContext("sys.type") == "fog")', code: 2, cback: null, bcasts: [] });
jnode.jcond.set('isDevice', { source: 'eval(jcondContext("sys.type") == "device")', code: 1, cback: null, bcasts: [] });

function shareOnFog() {
jnode.machAsyncExec("shareOnFog", [  ], "jcond.get('isFog').source", 2, "jcond.get('isFog').bcasts", "jcond.get('isFog').cback");
}
shareOnFog();
function spotFlowFunc(inputFlow) {
return inputFlow;
}
function isFogRunning() {
return jnode.machSyncExec("isFogRunning", [  ], "jcond.get('isFog').source", 2, "jcond.get('isFog').bcasts", "jcond.get('isFog').cback");
}
function getAssignedID() {
return jnode.machSyncExec("getAssignedID", [  ], "jcond.get('isDevice').source", 1, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
function getLabel(assignedID) {
return jnode.machSyncExec("getLabel", [ assignedID ], "jcond.get('isDevice').source", 1, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
function getPostcode(assignedID) {
return jnode.machSyncExec("getPostcode", [ assignedID ], "jcond.get('isDevice').source", 1, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
function getAddress(assignedID) {
return jnode.machSyncExec("getAddress", [ assignedID ], "jcond.get('isDevice').source", 1, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
function getStreamKey(assignedID) {
return jnode.machSyncExec("getStreamKey", [ assignedID ], "jcond.get('isDevice').source", 1, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
function addBroadcastHook() {
jnode.machAsyncExec("addBroadcastHook", [  ], "jcond.get('isDevice').source", 1, "jcond.get('isDevice').bcasts", "jcond.get('isDevice').cback");
}
allocSensorIn.setTerminalFunction(function (data) {
assignment.broadcast(data);
});
addBroadcastHook();
function changeState(state,spotID,k) {
if(typeof state === "function") { state = state.name; }
if(typeof spotID === "function") { spotID = spotID.name; }
if(typeof k === "function") { k = k.name; }
jnode.remoteAsyncExec("changeState", [ state,spotID,k ], "true", 0, "[]", "");
}

function callshareOnFog() {
sensingOut.start();

jnode.poplevel();
}
function callspotFlowFunc(inputFlow) {
return inputFlow;

jnode.poplevel();
}
function callisFogRunning() {
return 1;

jnode.poplevel();
}
function callgetAssignedID() {
console.log("IN GET ASSIGNED ID");
return devices++;

jnode.poplevel();
}
function callgetLabel(assignedID) {
return labels[assignedID - 1];

jnode.poplevel();
}
function callgetPostcode(assignedID) {
return postcodes[assignedID - 1];

jnode.poplevel();
}
function callgetAddress(assignedID) {
return addresses[0];

jnode.poplevel();
}
function callgetStreamKey(assignedID) {
for (var i = 0; i < spot.size(); i++) {
var lastValue = spot[i].getLastValue();
if (lastValue == null) {
continue;
}
if (lastValue.assignedID && lastValue.assignedID == assignedID) {
return spot[i].getDeviceId();
}
}
console.error("Did not find Stream Key");
return "null";

jnode.poplevel();
}
function calladdBroadcastHook() {
assignment.addHook(function (pack) {
if (pack.origin === "parent") {
var message = pack.message;
var datastream = null;
for (var i = 0; i < spot.size(); i++) {
if (spot[i].getDeviceId() == message.key) {
datastream = spot[i];
break;
}
}
if (datastream == null) {
return;
}
changeState(message.status, message.slotID, message.key);
}
});

jnode.poplevel();
}
var mbox = {
"functions": {
"shareOnFog": callshareOnFog,
"spotFlowFunc": callspotFlowFunc,
"isFogRunning": callisFogRunning,
"getAssignedID": callgetAssignedID,
"getLabel": callgetLabel,
"getPostcode": callgetPostcode,
"getAddress": callgetAddress,
"getStreamKey": callgetStreamKey,
"addBroadcastHook": calladdBroadcastHook,
},
"signatures": {
"shareOnFog": "",
"spotFlowFunc": "x",
"isFogRunning": "",
"getAssignedID": "",
"getLabel": "n",
"getPostcode": "n",
"getAddress": "n",
"getStreamKey": "n",
"addBroadcastHook": "",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

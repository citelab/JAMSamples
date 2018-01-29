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
jnode.addLogger("temp", temp);
var pack = new JAMLogger(JAMManager, "pack");
jnode.addLogger("pack", pack);
var tempFlow = tempFlowFunc(Flow.from(temp));
var packFlow = packFlowFunc(Flow.from(pack));
var started = false;
function tempFlowFunc(inputFlow) {
return inputFlow.select("data").runningReduce({
min: null,
max: null,
sum: null
});
}
function packFlowFunc(inputFlow) {
return inputFlow.select("data").runningReduce({
min: "age",
max: "age",
sum: "age",
custom: function (currentValue, newValue) {if (currentValue === null) {
return newValue.name;
}
return currentValue.length > newValue.name.length ? currentValue : newValue.name;
}
});
}
(function poll() {
if (temp.size() < 1 || pack.size() < 1) {
console.log("waiting for a C-node");
setTimeout(poll, 2000);
} else {
tempFlow.startPush();
packFlow.startPush();
started = true;
}
})();
setInterval(function () {
if (!started) {
return;
}
console.log("\n-- Temperature Data --");
console.log("Minimum is ", tempFlow.getMin());
console.log("Maximum is ", tempFlow.getMax());
console.log("Sum is ", tempFlow.getSum());
console.log("Last is ", tempFlow.getLast());
console.log("Average is ", tempFlow.getAverage());
console.log("\n-- Custom Data --");
console.log("Minimum is ", packFlow.getMin());
console.log("Maximum is ", packFlow.getMax());
console.log("Sum is ", packFlow.getSum());
console.log("Last is ", packFlow.getLast());
console.log("Average is ", packFlow.getAverage());
console.log("Custom Result is ", packFlow.getCustomResult());
console.log();
}, 1e4);
function calltempFlowFunc(inputFlow) {
return inputFlow.select("data").runningReduce({
min: null,
max: null,
sum: null
});

jnode.poplevel();
}
function callpackFlowFunc(inputFlow) {
return inputFlow.select("data").runningReduce({
min: "age",
max: "age",
sum: "age",
custom: function (currentValue, newValue) {if (currentValue === null) {
return newValue.name;
}
return currentValue.length > newValue.name.length ? currentValue : newValue.name;
}
});

jnode.poplevel();
}
var mbox = {
"functions": {
"tempFlowFunc": calltempFlowFunc,
"packFlowFunc": callpackFlowFunc,
},
"signatures": {
"tempFlowFunc": "x",
"packFlowFunc": "x",
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

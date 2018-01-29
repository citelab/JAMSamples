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
var MTLWeather = new JAMLogger(JAMManager, "MTLWeather");
jnode.addLogger("MTLWeather", MTLWeather);
var notify = function (key, entry, device) {
var size = device.size();
console.log("Logging the " + size + "-th data " + entry + " into logger " + " key");
var lastData = device.lastData();
console.log("Last data received", lastData);
var lastValue = device.lastValue();
console.log("Last value received", lastValue);
var data = device.data();
var values = device.values();
if (device.size() >= 10) {
var last10Data = device.n_data(10);
console.log("Last 10 data received", last10Data);
}
if (device.size() >= 10) {
var last10Values = device.n_values(10);
console.log("Last 10 values received", last10Values);
}
if (device.size() > 20) {
var aValue = device.get_value_at(20);
}
if (device.size() > 20) {
var someValue = device.get_range_values(5, 10);
}
var today = new Date(2017, 7, 14, 0, 0, 0);
var dataToday = device.dataAfter(today);
var valuesToday = device.valuesAfter(today);
console.log("Received " + valuesToday.length + " data today");
var yesterday = new Date(2017, 7, 13, 0, 0, 0);
var dataYesterday = device.dataBetween(today, yesterday);
var valueYesterday = device.valuesBetween(today, yesterday);
console.log("Received " + valueYesterday.length + " data yesterday");
};
MTLWeather.subscribe(notify);
var mbox = {
"functions": {
},
"signatures": {
}
}
jamlib.registerFuncs(mbox);
jamlib.run(function() { console.log("JAMLib 1.0beta Initialized."); } );

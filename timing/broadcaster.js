var fs = require('fs');
var clock = require('posix-clock');
var NanoTimer = require('nanotimer');
var nanoTimerObject = new NanoTimer();


jdata {
    char* broadcastTime as broadcaster;
}

var loggerResults = new Array();
var numTests = 1000;

var counter = 0;

var interval = setInterval(function() {
	var clockTime = clock.gettime(clock.MONOTONIC);
    var timeString = clockTime.sec + clockTime.nsec.toString().padStart(9, "0");
	broadcastTime.broadcast(timeString);
	counter++;
	if(counter === numTests) {
		console.log("Tests Finished");
	}
}, 10);
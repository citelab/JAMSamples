var fs = require('fs');
var clock = require('posix-clock');
var NanoTimer = require('nanotimer');
var nanoTimerObject = new NanoTimer();


jdata {
    char* logTime as logger;
}

var loggerResults = new Array();
var numTests = 1000;

var counter = 0;
nanoTimerObject.setInterval(function() {
	console.log(logTime.size());
    if (logTime[1] !== undefined) {
		if(logTime[1].index_of_last_value > counter) {
    		var clockTime = clock.gettime(clock.MONOTONIC);
    		var timeString = clockTime.sec + clockTime.nsec.toString().padStart(9, "0");
    		var delay = Number(timeString) - Number(logTime[1].lastValue());
    		loggerResults.push(delay);
    		counter = logTime[1].index_of_last_value;
    	}
		if(counter === numTests) {
			nanoTimerObject.clearInterval();
			console.log("Writing Results");
			fs.writeFile('logger.txt', loggerResults.join("\n"), (err) => {
			 	if (err) throw err;
			});
			console.log("Done");
		}
    }
}, '', '1u');
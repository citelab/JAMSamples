var fs = require('fs');
var clock = require('posix-clock');
var NanoTimer = require('nanotimer');
var nanoTimerObject = new NanoTimer();

jdata {
    char* logTime as logger;
    char* broadcastTime as broadcaster;
}

var numTests = 1000;
var clockResolution = clock.getres(clock.MONOTONIC);
var results = new Array();
var tests = {
	seqAsync: new Array(),
	parAsync: new Array(),
	sync: new Array(),
	logger: new Array(),
	jSyncRound: new Array(),
	jAsyncRound: new Array()
}




jasync function seqAsync(startSec, startNS) {

	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay = clockTime.nsec - startNS;


	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}

	tests.seqAsync.push(nsDelay);
    asyncDone();
}

jasync function parAsync(startSec, startNS) {
	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay =  clockTime.nsec - startNS;
	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}
	tests.parAsync.push(nsDelay);
	if(tests.parAsync.length === numTests) {
		asyncDone2();
	}
}

jsync function syncJS(startSec, startNS) {
	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay =  clockTime.nsec - startNS;
	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}
	tests.sync.push(nsDelay);
	return 0;
}

jsync function emptyJS() {
	return 0;
}

jsync function startLoggerTest() {
	var counter = 0;
	nanoTimerObject.setInterval(function() {
	    if (logTime[1] !== undefined) {
    		if(logTime[1].index_of_last_value > counter) {
	    		var clockTime = clock.gettime(clock.MONOTONIC);
	    		var timeString = clockTime.sec + clockTime.nsec.toString().padStart(9, "0");
	    		var delay = Number(timeString) - Number(logTime[1].lastValue());
	    		tests.logger.push(delay);
	    		counter = logTime[1].index_of_last_value;
	    	}
    		if(counter === numTests) {
    			nanoTimerObject.clearInterval();
    		}
	    }
	}, '', '1u');
	return 0;
}


function jSyncRound() {
	for (var i = 0; i < numTests; i++) {
		var startTime = clock.gettime(clock.MONOTONIC);
		cSyncReturn();

		var endTime = clock.gettime(clock.MONOTONIC);
		var secDelay = endTime.sec - startTime.sec;
		var nsDelay =  endTime.nsec - startTime.nsec;
		if(secDelay > 0) {
			nsDelay = 1000000000 - nsDelay;
		}

		tests.jSyncRound.push(nsDelay);
	}
}

function jAsyncRound() {
	for (var i = 0; i < numTests; i++) {
		var startTime = clock.gettime(clock.MONOTONIC);

		cAsyncReturn();

		var endTime = clock.gettime(clock.MONOTONIC);
		var secDelay = endTime.sec - startTime.sec;
		var nsDelay =  endTime.nsec - startTime.nsec;
		if(secDelay > 0) {
			nsDelay = 1000000000 - nsDelay;
		}

		tests.jAsyncRound.push(nsDelay);
	}
}

function broadcastTest() {
	var counter = 0;
	var interval = setInterval(function() {
		var clockTime = clock.gettime(clock.MONOTONIC);
	    var timeString = clockTime.sec + clockTime.nsec.toString().padStart(9, "0");
		broadcastTime.broadcast(timeString);
		counter++;
		// if(counter === numTests) {
		// 	clearInterval(interval);
		// }
	}, 10);
}
// jasync function startLoggerTest() {
// 	counter = 0;
// 	while(logTime[1] === undefined) {
// 		console.log(logTime[1]);
// 		console.log("HEY");
// 	}
// 	while(true) {
// 		console.log(logTime[1].lastValue());
// 		if(logTime[1].lastValue() == counter) {
// 		    counter++;
// 		    console.log(counter);
// 		    if(counter === numTests) {
// 		        break;
// 		    }
// 		}
// 	}
// }
jasync function writeResults() {
	console.log("Writing Results");
	fs.writeFile('seqAsync.txt', tests.seqAsync.join("\n"), (err) => {
	  if (err) throw err;
	});
	// fs.writeFile('parAsync.txt', tests.parAsync.join("\n"), (err) => {
	//   if (err) throw err;
	// });
	// fs.writeFile('sync.txt', tests.sync.join("\n"), (err) => {
	//   if (err) throw err;
	// });
	// fs.writeFile('logger.txt', tests.logger.join("\n"), (err) => {
	//   if (err) throw err;
	// });
	// fs.writeFile('jSyncRound.txt', tests.jSyncRound.join("\n"), (err) => {
	//   if (err) throw err;
	// });
	// fs.writeFile('jAsyncRound.txt', tests.jAsyncRounds.join("\n"), (err) => {
	//   if (err) throw err;
	// });
}

// broadcastTest();

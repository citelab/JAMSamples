var fs = require('fs');
var clock = require('posix-clock');
var NanoTimer = require('nanotimer');
var nanoTimerObject = new NanoTimer();

jcond {
	fogonly: 1 < 2;
}


var numTests = 1000;
var clockResolution = clock.getres(clock.MONOTONIC);
var results = new Array();
var tests = {
	seqAsync: new Array(),
	parAsync: new Array(),
	sync: new Array(),
	syncCond: new Array(),
	jSyncRound: new Array(),
	jAsyncRound: new Array(),
	warmUpAsync: new Array(),
	warmUpSync: new Array(),
}


jasync function warmUpAsync(startSec, startNS) {

	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay = clockTime.nsec - startNS;


	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}

	tests.warmUpAsync.push(nsDelay);
    warmUpDone();
}

jsync function warmUpSync(startSec, startNS) {
	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay =  clockTime.nsec - startNS;
	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}
	tests.warmUpSync.push(nsDelay);
	return 0;
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

jsync {fogonly} function syncJSCond(startSec, startNS) {
	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay =  clockTime.nsec - startNS;
	if(secDelay > 0) {
		nsDelay = 1000000000 - nsDelay;
	}
	tests.syncCond.push(nsDelay);
	return 0;
}


jsync function emptyJS() {
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

jasync function startJSTests() {
	asyncSequential();
}

function asyncSequential() {
	var clockTime = clock.gettime(clock.MONOTONIC);
	sequentialAsync(clockTime.sec, clockTime.nsec);
}

var iteration = 0;
jasync function jSequentialDone() {
	iteration++;
	if(iteration < numTests) {
		asyncSequential();
	} else {
		asyncParallel();
	}
}

function asyncParallel() {
	var clockTime;
	for (var i = 0; i < numTests; i++) {
		clockTime = clock.gettime(clock.MONOTONIC);
		parallelAsync(clockTime.sec, clockTime.nsec);
	}
}


jasync function jParallelDone() {
	writeJSResults();
}





function writeJSResults() {
	console.log("Writing Results");
	fs.writeFile('seqAsync.txt', tests.seqAsync.join("\n"), (err) => {
	  if (err) throw err;
	});
	fs.writeFile('parAsync.txt', tests.parAsync.join("\n"), (err) => {
	  if (err) throw err;
	});
	fs.writeFile('sync.txt', tests.sync.join("\n"), (err) => {
	  if (err) throw err;
	});
	fs.writeFile('syncCond.txt', tests.syncCond.join("\n"), (err) => {
	  if (err) throw err;
	});
	fs.writeFile('jAsyncRound.txt', tests.jAsyncRound.join("\n"), (err) => {
	  if (err) throw err;
	});
	fs.writeFile('warmUpAsync.txt', tests.warmUpAsync.join("\n"), (err) => {
	  if (err) throw err;
	});
	fs.writeFile('warmUpSync.txt', tests.warmUpSync.join("\n"), (err) => {
	  if (err) throw err;
	});
	writeCResults();
}

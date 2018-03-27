var clock = require('posix-clock');
var clockResolution = clock.getres(clock.MONOTONIC);
var results = new Array();



jasync function timing(startSec, startNS) {
	var clockTime = clock.gettime(clock.MONOTONIC);
	var secDelay = clockTime.sec - startSec;
	var nsDelay =  clockTime.nsec - startNS;
	if(secDelay > 0) {
		console.log("WARNING: DELAY OVER 0 SECONDS");
	}
	console.log(nsDelay);
	results.push(nsDelay);
    asyncDone();
}
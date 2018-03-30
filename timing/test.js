var clock = require('posix-clock');
var clockResolution = clock.getres(clock.MONOTONIC);

var clockTime = clock.gettime(clock.MONOTONIC);

var clockTime2 = clock.gettime(clock.MONOTONIC);
var secDelay = clockTime2.sec - clockTime.sec;
var nsDelay =  clockTime2.nsec - clockTime.nsec;

console.log(nsDelay);
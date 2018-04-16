var microtime = require('microtime');

jdata {
    char* logTime as logger;
    char* broadcastTime as broadcaster;
}

logTime.subscribe((key, entry, stream) => {
    var hrTime = process.hrtime();
    var microJ = microtime.now();
    var logParts = entry.log.split(',');
    var microC = logParts[0] * 1000000 + (logParts[1] - 0);

    console.log(entry.log, ",", microJ - microC, "µs");
});


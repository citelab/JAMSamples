jdata{
    char* cloudLog as logger;
}

var microtime = require('microtime');

var handle = new InFlow(JAMManager);

if( JAMManager.isFog ) {
    handle.setTerminalFunction(function (input) {
        cloudLog.getMyDataStream().log(input.data);
        //TODO do some processing here before logging to cloud
    });
}

handle.openFlow("cloudMeasure");

if( JAMManager.isCloud ){
    cloudLog.subscribe(function(key, entry, stream){
        var input = entry.log;

        if (input.indexOf("Network") != 0) {
            var microJ = microtime.now();
            var logParts = input.split(',');
            var microC = logParts[0] * 1000000 + (logParts[1] - 0);

            console.log("ExecTime,", input, ",", microJ - microC, "µs");
        }
    });
}
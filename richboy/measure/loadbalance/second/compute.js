jdata{
    char* waste as logger;
}

var microtime = require('microtime');

var handle = new InFlow(JAMManager);

handle.setTerminalFunction(function(input){
    //console.log(input);
    input = input.data;

    if( input.indexOf("Network") != 0 ) {
        var microJ = microtime.now();
        var logParts = input.split(',');
        var microC = logParts[0] * 1000000 + (logParts[1] - 0);

        console.log("ExecTime,", input, ",", microJ - microC, "µs");
    }
});

handle.openFlow("fixed");

console.log("In second app");
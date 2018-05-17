jdata{
    char* waste as logger;
}

var microtime = require('microtime');
var fs = require('fs');

var handle = new InFlow(JAMManager);

var ws = fs.createWriteStream("output.txt", {flags:'a'});

handle.setTerminalFunction(function(input){
    //console.log(input);
    input = input.data;

    var microJ = microtime.now();
    var logParts = input.split(',');
    var microC = logParts[0] * 1000000 + (logParts[1] - 0);

    console.log("ExecTime,", input, ",", microJ - microC, "µs");
    ws.write("ExecTime," + input + "," + (microJ - microC) + "µs" + "\n");
});

handle.openFlow("filtered");

console.log("In second app");
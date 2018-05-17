jdata{
    char* sensePack as logger(fog);
    char* timing as logger(fog);
    char* announcer as broadcaster;
    int tagID as logger(fog);
}

jcond{
    isFog: sys.type == "fog";
    isDevice: sys.type == "device";
}

var microtime = require('microtime');
var fs = require('fs');

var ws;

var deviceId = 0;
var myID;


// jsync function to assign id's to devices
jsync {isFog} function getId() {
    console.log("Got here");
    var id = ++deviceId;
    return id + "";
}

jsync {isDevice} function setId(id) {   //ID is gotten from the fog and saved on the device J to filter broadcast messages
    myID = id;
}

if( JAMManager.isDevice ) {
    console.log("device has started...");

    ws = fs.createWriteStream("output.txt", {flags:'a'});
    sensePack.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
    console.log("Tag is: ", jsys.tags);
    tagID.subscribe(function(key, entry){
        myID = entry.log;
        console.log("My ID is:", myID);
    });
}
else
    console.log("Fog has started...");

//announcer.addHook((data) => {console.log(data);});

if( JAMManager.isFog ) {
    tagID.subscribe(function(key, entry, stream){
        console.log("tagID: ", entry.log);
        deviceId = Math.max(deviceId, parseInt(entry.log));
    });

    sensePack.subscribe((key, entry, stream) => {
        if( stream.getKey() == sensePack.getMyDataStream().getKey() )   //skip logs by this stream. It's for outflow
            return;

        console.log("received", JSON.stringify(entry.log));

        if (entry.log != "done") {
            //broadcast back to the device
            transfer(entry.log);
        }
    });
}

if( JAMManager.isDevice ){//intercept broadcast and measure time
    announcer.addHook(function(pack){
        var input = pack.message;

        var parts = input.split(",");

        if( myID == parts[parts.length - 2] ) {    //check if this broadcast is for this device
            var microJ = microtime.now();
            var logParts = input.split(',');
            var microC = logParts[0] * 1000000 + (logParts[1] - 0);

            console.log("ExecTime,", input, ",", microJ - microC, "µs");
            ws.write("ExecTime," + input + "," + (microJ - microC) + "µs\n");
        }
    });
}


function transfer(data){   //broadcast data to devices
    announcer.broadcast(data + "");
}


var initialLoad = setInterval(function(){
    if (sensePack.size() > 1) {
        clearInterval(initialLoad);
        console.log("Starting simulation...");
    }
    else {
        console.log("Waiting for devices to become available...", sensePack.size());
    }
}, 1000);
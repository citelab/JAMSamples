jdata{
    char* sensePack as logger(fog);
    char* timing as logger(fog);
    char* announcer as broadcaster;

    timingFlow as flow with timingFlowFunc of timing;
}

jcond{
    isFog: sys.type == "fog";
    isDevice: sys.type == "device";
}

var fs = require('fs');

var deviceId = 0;
var PROCESS_COUNT = 1;

// jsync function to assign id's to devices
jsync {isFog} function getId() {
    var id = ++deviceId;
    return id + "";
}

jsync {isDevice} function getPayload() {
    return PROCESS_COUNT;
}


if( JAMManager.isDevice ) {
    console.log("device has started...");
    sensePack.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
}
else
    console.log("Fog has started...");

//announcer.addHook((data) => {console.log(data);});

if( JAMManager.isFog ) {
    sensePack.subscribe((key, entry, stream) => {
        console.log("received", JSON.stringify(entry.log));

        var parts = entry.log.split(",");
        announcer.broadcast(parts[2].replace(/\s/g, '').replace('\n', "") + "," + parts[2].replace(/\s/g, '').replace('\n', "") + "," + parts[parts.length - 2] + "," + parts[parts.length - 1]);
        if( parts[parts.length - 3] == "last" ){//send again just incase they get lost
            //console.log("got in here");
            setTimeout(function(){
                announcer.broadcast(parts[2].replace(/\s/g, '').replace('\n', "") + "," + parts[2].replace(/\s/g, '').replace('\n', "") + "," + parts[parts.length - 2] + "," + parts[parts.length - 1]);
            }, 100);
            setTimeout(function(){
                announcer.broadcast(parts[2].replace(/\s/g, '').replace('\n', "") + "," + parts[2].replace(/\s/g, '').replace('\n', "") + "," + parts[parts.length - 2] + "," + parts[parts.length - 1]);
            }, 200);
        }
    });

    var ws = fs.createWriteStream("timings_"+ JAMManager.getLevelCode() +".txt", {flags:'a'});
    ws.write("Payload: " + PROCESS_COUNT + "\n");
        //ws.end();
    timingFlow.setTerminalFunction(input => {
        ws.write(input + "\n");
    });
    timingFlow.startPush();
}

function timingFlowFunc(inputFlow){
    return inputFlow.select("data");
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
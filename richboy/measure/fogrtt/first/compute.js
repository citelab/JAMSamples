jdata{
    char* sensePack as logger(fog);
    char* timing as logger(fog);
    char* firstLog as logger(fog);
    char* announcer as broadcaster;
}

jcond{
    isFog: sys.type == "fog";
    isDevice: sys.type == "device";
}

var microtime = require('microtime');
var Worker = require('webworker-threads').Worker;
var myFlow = Flow.from(sensePack.getMyDataStream());

var outflow = new OutFlow(myFlow, JAMManager);
outflow.setName("fixed");
outflow.start();

var deviceId = 0;
var droneData = {}; //stores all the received data from the devices in a datastream key/array pair format

var isRequestPending = false;
var queue = []; //work queue. When ever the worker is free, it requests for data and we will send it from this queue
var queuePointer = -1;
var worker;
var completed = 0;  //number of jobs completed by the worker
var myID;


var inbound = new InFlow(JAMManager);

var myFlow = Flow.from(firstLog.getMyDataStream());

var outbound = new OutFlow(myFlow, JAMManager);
outbound.setName("firstToSecond");


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
    sensePack.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
}
else
    console.log("Fog has started...");

//announcer.addHook((data) => {console.log(data);});

if( JAMManager.isFog ) {
    outbound.start();

    //listen for message from other app
    inbound.setTerminalFunction(function(input){
        processMessageFromOtherApp(JSON.parse(input.data));
    });
    inbound.openFlow("secondToFirst");


    sensePack.subscribe((key, entry, stream) => {
        if( stream.getKey() == sensePack.getMyDataStream().getKey() )   //skip logs by this stream. It's for outflow
            return;

        console.log("received", JSON.stringify(entry.log));

        if (!droneData[key])
            droneData[key] = [];

        if (entry.log == "done") {
            //save to queue
            queue.push({data: droneData[key], stream: stream});

            if( isRequestPending ){
                isRequestPending = false;
                queuePointer++;
                sendMessageToOtherApp({cmd: 'newJob', data: queue[queuePointer].data});
            }
        }
        else
            droneData[key].push(entry.log);
    });

    // var ws = fs.createWriteStream("timings.txt", {flags:'a'});
    // ws.write("Payload: " + PROCESS_COUNT + "\n");
    // //ws.end();
    // timingFlow.setTerminalFunction(input => {
    //     ws.write(input + "\n");
    // });
    // timingFlow.startPush();
}

if( JAMManager.isDevice ){//intercept broadcast and measure time
    announcer.addHook(function(pack){
        var input = pack.message;

        if( input.indexOf("Network") < 0 ) {    //ignore the network data broadcast
            var parts = input.split(",");

            if( myID === parts[parts.length - 2] ) {    //check if this broadcast is for this device
                var microJ = microtime.now();
                var logParts = input.split(',');
                var microC = logParts[0] * 1000000 + (logParts[1] - 0);

                console.log("ExecTime,", input, ",", microJ - microC, "µs");
            }
        }
    });
}


function transfer(data, network){   //broadcast data to devices
    var array = data.split(",");
    announcer.broadcast(data + "");
    announcer.broadcast(array[array.length - 2] + "|||Network=" + JSON.stringify(network));
}

// function startBroadcast(array, stream){
//     console.log("In start broadcast");
//     array.forEach(function(obj, index){
//         //console.log(obj.id);
//         announcer.broadcast(oneHotDecode(myNetwork.activate(obj.input)) + "," + obj.expected + "," + obj.nodeID + "," + obj.id);
//     });
//     announcer.broadcast("_,_," + array[0].nodeID + ",done");    //to signal the end of broadcasting
//     console.log("Done broadcasting!!!");
// }


var initialLoad = setInterval(function(){
    if (sensePack.size() > 1) {
        clearInterval(initialLoad);
        console.log("Starting simulation...");
    }
    else {
        console.log("Waiting for devices to become available...", sensePack.size());
    }
}, 1000);


function sendMessageToOtherApp(pack){
    firstLog.getMyDataStream().log(JSON.stringify(pack));
}

function processMessageFromOtherApp(msg){
    switch(msg.cmd){
        case "newJob":
            console.log("new job requested");
            //get oldfirst job
            if( queuePointer < queue.length - 1 ){
                queuePointer++;
                sendMessageToOtherApp({cmd: 'newJob', data: queue[queuePointer].data});
            }
            else
                isRequestPending = true;

            break;
        case "completed":
            console.log("completed a job");
            completed++;
            transfer(msg.data, msg.network);    //broadcast to device J

            //check if completed equals the number of devices
            if( completed == deviceId ){
                console.log("Program completed...");
            }
            else{//check if we have any more job
                if( queuePointer < queue.length - 1 ){
                    isRequestPending = false;
                    queuePointer++;
                    sendMessageToOtherApp({cmd: 'newJob', data: queue[queuePointer].data});
                }
                else
                    isRequestPending = true;
            }

            break;
    }
}
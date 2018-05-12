jdata{
    char* sensePack as logger(fog);
    char* timing as logger(fog);
}

jcond{
    isFog: sys.type == "fog";
    isDevice: sys.type == "device";
}

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

// jsync function to assign id's to devices
jsync {isFog} function getId() {
    console.log("Got here");
    var id = ++deviceId;
    return id + "";
}

if( JAMManager.isDevice ) {
    console.log("device has started...");
    sensePack.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
}
else
    console.log("Fog has started...");

//announcer.addHook((data) => {console.log(data);});

if( JAMManager.isFog ) {
    //create a worker.
    worker = new Worker("worker.js");

    worker.onmessage = function(event){
        console.log("message received form worker", event);
        var msg = event.data;
        switch(msg.cmd){
            case "newJob":
                console.log("new job requested");
                //get oldfirst job
                if( queuePointer < queue.length - 1 ){
                    queuePointer++;
                    worker.postMessage({cmd: 'newJob', data: queue[queuePointer].data});
                }
                else
                    isRequestPending = true;

                break;
            case "completed":
                console.log("completed a job");
                completed++;
                transfer(msg.data, msg.network);    //send to outflow

                //check if completed equals the number of devices
                if( completed == deviceId ){
                    console.log("Program completed...");
                    worker.terminate();
                }
                else{//check if we have any more job
                    if( queuePointer < queue.length - 1 ){
                        isRequestPending = false;
                        queuePointer++;
                        worker.postMessage({cmd: 'newJob', data: queue[queuePointer].data});
                    }
                    else
                        isRequestPending = true;
                }

                break;
        }
    };

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
                worker.postMessage({cmd: 'newJob', data: queue[queuePointer].data});
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


function transfer(data, network){
    sensePack.getMyDataStream().log(data + "");
    sensePack.getMyDataStream().log("Network=" + JSON.stringify(network));
    //myFlow.push(data);
    //myFlow.push("Network=" + JSON.stringify(network));   //send the network to the next application for prediction
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
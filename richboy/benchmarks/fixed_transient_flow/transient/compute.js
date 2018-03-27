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
var comm = new RealtimeFlow("fixed", "comm", null, receiveFunc);

var directions = ['Move-Forward', 'Sharp-Right-Turn', 'Slight-Right-Turn', 'Sharp-Left-Turn', 'Slight-Left-Turn'];
var deviceId = 0, jobId = 0;
var PROCESS_COUNT = 1;    //the number of items each device will process.
var nodeJobs = []; //structure=> array of {jobID, nodeID, nodes, startIndex, endIndex, totalProcessed, lastUpdated, finished}
var MAX_RUNNING_JOBS = 3;
var TOTAL_ITEMS = 5456;
var TIMEOUT = 5000;
var tracker = 1;
var streamsMap = {};

// jsync function to assign id's to devices
jsync {isDevice} function getId() {
    var id = ++deviceId;
    return id + "";
}

jsync {isDevice} function getJob(nodeID){
    //console.log("In get Job");
    var id = ++jobId;

    //check if there is any unfinished job that the last updated time is more than 5 seconds ago
    var jobs = Flow.from(nodeJobs).where(job => !job.finished && new Date().getTime() - job.lastUpdated > TIMEOUT).collect();
    if( jobs.length > 0 ) {
        var job = jobs[0];
        job.nodes.push(nodeID - 0);
        job.nodeID = nodeID - 0;
        return job.jobID + "," + (job.startIndex + job.totalProcessed) + "," + job.endIndex;
    }
    else if( jobs.length >= MAX_RUNNING_JOBS ){//check if there is a maximum number of active node already working. If there are, then send a no job available message
        return "0,0,0";
    }
    else{//check if all jobs have been exhausted. If any available, create job else send a no job available message
        if( nodeJobs.length > 0 && nodeJobs[nodeJobs.length - 1].endIndex >= TOTAL_ITEMS ) {
            console.log("ALL JOBS ASSIGNED!!!");
            console.log(Flow.from(nodeJobs).select("finished").allMatch(status => status) ? "ALL JOBS FINISHED" : "SOME JOBS PENDING");
            return "0,0,0";
        }
        else{//create new job
            var startIndex = nodeJobs.length > 0 ? nodeJobs[nodeJobs.length - 1].endIndex : 0;
            var job = {
                jobID: id,
                nodeID: nodeID - 0,
                nodes: [nodeID - 0],
                startIndex: startIndex,
                endIndex: Math.min(startIndex + PROCESS_COUNT, TOTAL_ITEMS),
                totalProcessed: 0,
                lastUpdated: new Date().getTime(),
                finished: false,
                data: []
            };
            nodeJobs.push(job);
            return job.jobID + "," + job.startIndex + "," + job.endIndex;
        }
    }
}


if( JAMManager.isDevice ) {
    console.log("device has started...");
    sensePack.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
}
else
    console.log("Fog has started...");

//announcer.addHook((data) => {console.log(data);});

if( JAMManager.isDevice ) {
    sensePack.subscribe((key, entry, stream) => {
        //console.log("received", JSON.stringify(entry.log));

        var parts = entry.log.split(",");
        var job = Flow.from(nodeJobs).where(job => job.jobID == parts[parts.length - 3]).findFirst();
        job.data.push(entry.log);
        job.lastUpdated = new Date().getTime();

        if( job.data.length == PROCESS_COUNT ){
            job.finished = true;
            processArrayData(job.data, stream);
        }
    });

    var ws = fs.createWriteStream("fixed_transient_timings.txt", {flags:'a'});
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

function processArrayData(dataArray, stream){
    //console.log("First element is", dataArray[0]);
    var track = tracker++;
    streamsMap[track] = stream;
    var testData = selectTestData(dataArray);

    //send request to the fixed application for prediction
    console.log("Sending request to fixed: ", JSON.stringify(testData[0]));
    comm.send(Object.assign({}, testData[0], {track: track}));
}

function receiveFunc(obj){  //receive message from the other app and broadcast to C node
    console.log("Received from Fixed: ", JSON.stringify(obj));
    announcer.broadcast(obj.resp + "," + obj.expected + "," + obj.nodeID + "," + obj.id);
    announcer.broadcast("_,_," + obj.nodeID + ",done");    //to signal the end of broadcasting
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

function selectTestData(array){
    return Flow.from(array).select(elem => {var parts = elem.split(','); return {input: [parts[0]-0, parts[1]-0], expected: parts[2].replace("\n", ""), id: parts[parts.length - 1] - 0, nodeID: parts[parts.length - 2]};}).collect();
}
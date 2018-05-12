jdata{
    char* sensePack as logger(fog);
    char* timing as logger(fog);

    sensePackFlow as flow with sensePackFlowFunc of sensePack;
    toSecond as outflow of sensePackFlow;

}
//fromSecond as inflow of app://second.toFirst;

jcond{
    isFog: sys.type == "fog";
    isDevice: sys.type == "device";
}

var Worker = require('webworker-threads').Worker;
var myFlow = Flow.from(sensePack.getMyDataStream());

var outflow = new OutFlow(myFlow, JAMManager);
outflow.setName("fixed");
outflow.start();

toSecond.start();

var deviceId = 0;
var droneData = {}; //stores all the received data from the devices in a datastream key/array pair format

var isRequestPending = false;
var queue = []; //work queue. When ever the worker is free, it requests for data and we will send it from this queue
var queuePointer = -1;
var worker;
var completed = 0;  //number of jobs completed by the worker

var fromSecond = new InFlow(JAMManager);
if( JAMManager.isFog ) {
    fromSecond.setTerminalFunction(function (data) {
        console.log(data);
    });
    fromSecond.openFlow("toFirst");
}

function sensePackFlowFunc(inputFlow){
    return inputFlow;
}

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
    worker = new Worker(function(){
        console.log("In worker...");
        //var Flow = (require('flows.js')()).Flow;

        importScripts('synaptic.js');
        console.log("after require");
        var Neuron = synaptic.Neuron,
            Layer = synaptic.Layer,
            Network = synaptic.Network,
            Trainer = synaptic.Trainer;

        // create the network
        var inputLayer = new Layer(2);
        var hiddenLayer = new Layer(2);
        var outputLayer = new Layer(5);

        inputLayer.project(hiddenLayer);
        hiddenLayer.project(outputLayer);

        var myNetwork = new Network({
            input: inputLayer,
            hidden: [hiddenLayer],
            output: outputLayer
        });

        var directions = ['Move-Forward', 'Sharp-Right-Turn', 'Slight-Right-Turn', 'Sharp-Left-Turn', 'Slight-Left-Turn'];
        var PROCESS_COUNT = 100;    //the number of items each device will process.
        var trainCount = 0.8 * PROCESS_COUNT;


        function processArrayData(dataArray){
            console.log("First element is", dataArray[0]);
            var randomizedDataArray = randomizeData(dataArray);
            var trainData = selectTrainData(randomizedDataArray);
            //var testData = selectTestData(randomizedDataArray);

            var trainer = new Trainer(myNetwork);

            var results = trainer.train(trainData, {rate: .2, iterations: 20000, shuffle: false});
            console.log("Done training!\n", results);
            //startBroadcast(testData, stream);

            //send job back to master
            postMessage({cmd: "completed", data: array[0], network: myNetwork.toJSON()});
            //transfer(dataArray, myNetwork.toJSON()); //send to outflow
        }


        function oneHotEncode(direction){
            switch(direction){
                case "Move-Forward":
                case "Move-Forward\n": return [1, 0, 0, 0, 0];

                case "Sharp-Right-Turn":
                case "Sharp-Right-Turn\n": return [0, 1, 0, 0, 0];

                case "Slight-Right-Turn":
                case "Slight-Right-Turn\n": return [0, 0, 1, 0, 0];

                case "Sharp-Left-Turn":
                case "Sharp-Left-Turn\n": return [0, 0, 0, 1, 0];

                case "Slight-Left-Turn":
                case "Slight-Left-Turn\n": return [0, 0, 0, 0, 1];
            }
            console.log("\nERROR!!! Drone Direction not found!\n");
            return [0,0,0,0,0];
        }

        function oneHotDecode(array){
            array = Flow.from(array).select(elem => Math.round(elem)).collect();
            var index = -1;
            for( var i = 0; i < array.length; i++ ){
                if( parseInt(array[i]) === 1 ){
                    index = i;
                    break;
                }
            }
            if( index === -1 ){
                console.log("Decode ERROR!!!");
                return "Error";
            }
            return directions[i];
        }

        function randomizeData(array){
            var newArray = array.slice(0);  //clone the original array oldfirst
            for (var i = newArray.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = newArray[i];
                newArray[i] = newArray[j];
                newArray[j] = temp;
            }
            return newArray;
        }

        function selectTrainData(array){//limit(Math.ceil(1.0 * array.length)).
            return Flow.from(array).select(elem => {var parts = elem.split(','); return {input: [parts[2]-0, parts[3]-0], output: oneHotEncode(parts[4])};}).collect();
        }

        function selectTestData(array){
            return Flow.from(array).skip(Math.ceil(0.5 * array.length)).select(elem => {var parts = elem.split(','); return {input: [parts[2]-0, parts[3]-0], output: oneHotEncode(parts[4]), expected: parts[4].replace("\n", ""), id: parts[parts.length - 1] - 0, nodeID: parts[parts.length - 2]};}).collect();
        }

        console.log("In here Worker");

        this.onmessage = function(event){
            console.log("received message from master");
            var msg = event.data;
            switch(msg.cmd){
                case "newJob": processArrayData(msg.data); break;
            }
        };
        //request for job from master
        postMessage({cmd: "newJob"});
    }); //To process neural networks

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
        // console.log("received", JSON.stringify(entry.log));
        //
        // if (!droneData[key])
        //     droneData[key] = [];
        //
        // if (entry.log == "done") {
        //     //save to queue
        //     queue.push({data: droneData[key], stream: stream});
        //
        //     if( isRequestPending ){
        //         isRequestPending = false;
        //         queuePointer++;
        //         worker.postMessage({cmd: 'newJob', data: queue[queuePointer].data});
        //     }
        // }
        // else
        //     droneData[key].push(entry.log);
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
    myFlow.push(data);
    myFlow.push("Network=" + JSON.stringify(network));   //send the network to the next application for prediction
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
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
var synaptic = require('synaptic');
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

var comm = new RealtimeFlow("transient", "comm", null, requestFunc);

var directions = ['Move-Forward', 'Sharp-Right-Turn', 'Slight-Right-Turn', 'Sharp-Left-Turn', 'Slight-Left-Turn'];
var deviceId = 0;
var PROCESS_COUNT = 350;    //the number of items each device will process.
var droneData = {}; //stores all the received data from the devices in a datastream key/array pair format

// jsync function to assign id's to devices
jsync {isDevice} function getId() {
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

if( JAMManager.isDevice ) {
    sensePack.subscribe((key, entry, stream) => {
        console.log("received", JSON.stringify(entry.log));

        if( !droneData[key] )
            droneData[key] = [];

        if( entry.log == "done" ) {
            //start training the data for this device
            processArrayData(droneData[key], stream);
            return;
        }
        else
            droneData[key].push(entry.log);
    });

    var ws = fs.createWriteStream("timings.txt", {flags:'a'});
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
    console.log("First element is", dataArray[0]);
    var randomizedDataArray = randomizeData(dataArray);
    var trainData = selectTrainData(randomizedDataArray);

    var trainer = new Trainer(myNetwork);

    var results = trainer.train(trainData, {rate: .2, iterations: 20000, shuffle: false});
    console.log("Done training!\n", results);
}

function startBroadcast(array, stream){
    console.log("In start broadcast");
    array.forEach(function(obj, index){
        //console.log(obj.id);
        announcer.broadcast(oneHotDecode(myNetwork.activate(obj.input)) + "," + obj.expected + "," + obj.nodeID + "," + obj.id);
    });
    announcer.broadcast("_,_," + array[0].nodeID + ",done");    //to signal the end of broadcasting
    console.log("Done broadcasting!!!");
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
    var newArray = array.slice(0);  //clone the original array first
    for (var i = newArray.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = newArray[i];
        newArray[i] = newArray[j];
        newArray[j] = temp;
    }
    return newArray;
}

function selectTrainData(array){
    return Flow.from(array).select(elem => {var parts = elem.split(','); return {input: [parts[0]-0, parts[1]-0], output: oneHotEncode(parts[2])};}).collect();
}

function requestFunc(obj){
    console.log("Received request from Transient: ", JSON.stringify(obj));
    var raw = myNetwork.activate(obj.input);
    var resp = oneHotDecode(raw);
    comm.send(Object.assign({}, obj, {resp: resp, raw: raw}));
}
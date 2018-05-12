jdata{
    char* writeLog as logger(fog);
    writeFlow as flow with writeFlowFunc of writeLog;

    writeOutflow as outflow of writeFlow;
}

// var myFlow = Flow.from(sensePack.getMyDataStream());
// var outflow = new OutFlow(myFlow, JAMManager);
// outflow.setName("toFirst");
// outflow.start();

writeOutflow.start();

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

var directions = ['Move-Forward', 'Sharp-Right-Turn', 'Slight-Right-Turn', 'Sharp-Left-Turn', 'Slight-Left-Turn'];
var PROCESS_COUNT = 100;    //the number of items each device will process.
var trainCount = 0.8 * PROCESS_COUNT;
var droneData = {}; //stores all the received data from the devices in a datastream key/array pair format


var fromFirst = new InFlow(JAMManager);

fromFirst.setTerminalFunction(function(data){
    console.log(data);
    writeLog.log("noKey", "dummy data");
});

fromFirst.openFlow("toSecond");

function writeFlowFunc(inputFlow){
    return inputFlow;
}

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
    self.postMessage({cmd: "completed", data: array[0], network: myNetwork.toJSON()});
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

// console.log("In Worker");
//
// self.onmessage = function(event){
//     console.log("received message from master");
//     var msg = event.data;
//     switch(msg.cmd){
//         case "newJob": processArrayData(msg.data); break;
//     }
// };
// //request for job from master
// self.postMessage({cmd: "newJob"});
jdata{
    struct sensorData{
        float sd_front;
        float sd_left;
        char* _class;
        char* nodeID;
        int id;
    } sensorData as logger(fog);

    char* sensePack as logger(fog);

    //sensorDataFlow as flow with sensorDataFunc of sensorData;

    // struct announcer{
    //     char* nodeID;
    //     char* message;
    // } announce as broadcaster;

    char* announcer as broadcaster;
}

var sensorDataFlow;

jcond{
    isFog: sys.type == "fog";
}

var synaptic = require('synaptic');
var Neuron = synaptic.Neuron,
    Layer = synaptic.Layer,
    Network = synaptic.Network,
    Trainer = synaptic.Trainer;

var directions = ['Move-Forward', 'Sharp-Right-Turn', 'Slight-Right-Turn', 'Sharp-Left-Turn', 'Slight-Left-Turn'];
var minNumberOfDevices = 1;//just once drone device is available now.
var deviceId = 0;
var splitIndex = Math.ceil(5456 * 0.8); //The data index which splits the training and testing data
var myNetwork;
var testData = [], testDataArray;
var done = false;

// jsync function to assign id's to devices
jsync function getId() {
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
    sensePack.subscribe((key, entry, stream) => {
        console.log("received", JSON.stringify(entry.log));

        var parts = entry.log.split(",");
        if( parts[parts.length - 1] - 0 > splitIndex ) {  //store all data after the split index to be used for testing
            testData.push(entry.log);
            if( parts[parts.length - 1] - 0 == 5456 ){//we've gotten all the data so start broadcasting
                testDataArray = selectTestData(testData);
                if( done )
                    startBroadcast(testDataArray);
                else
                    setTimeout(pollBroadcast, 100);
            }
        }


        // if (entry.log._class === "") {  //we have seen the end of sensor data for this stream
        //     console.log("Received end of stream marker");
        //     processForStream(stream);
        // }
        // else
        //     console.log("received ", entry.log._class);
    });
}

function pollBroadcast(){
    if( done )
        startBroadcast(testDataArray);
    else
        setTimeout(pollBroadcast, 100);
}

function startBroadcast(array){
    console.log("In start broadcast");
    array.forEach(function(obj, index){
        console.log(obj.id);
        announcer.broadcast(oneHotDecode(myNetwork.activate(obj.input)) + "," + obj.output + "," + obj.nodeID + "," + obj.id);
    });
    console.log("Done broadcasting!!!");
    //sendOneBroadcast(array, 0);
}

function sendOneBroadcast(array, index){
    if( index >= array.length ){
        console.log("Done broadcasting!!!");
        return;
    }

    setTimeout(function(){
        var obj = array[index];
        console.log(obj.id);
        announcer.broadcast(oneHotDecode(myNetwork.activate(obj.input)) + "," + obj.output + "," + obj.nodeID + "," + obj.id);

        index++;
        sendOneBroadcast(array, index);
    }, index == 0 ? 0 : 100);
}


function sensorDataFunc(inputFlow){
    return inputFlow.discretize(Flow.from(sensePack.toIterator()).where(stream => !stream.isLocalStream).collect(), (data) => {var parts = data[0].data.split(','); return parts[parts.length - 1] - 0 === splitIndex; });
}

function processArrayData(dataArray){
    //remove the marker/delimiter
    dataArray.splice(dataArray.length - 1);

    console.log("First element is", dataArray[0]);
    //var randomizedDataArray = randomizeData(dataArray);
    var trainData = selectTrainData(dataArray);
    //var testData = selectTestData(randomizedDataArray);

    // create the network
    var inputLayer = new Layer(2);
    var hiddenLayer = new Layer(2);
    var outputLayer = new Layer(5);

    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    //console.log("Got here");

    myNetwork = new Network({
        input: inputLayer,
        hidden: [hiddenLayer],
        output: outputLayer
    });

    //console.log("Also got here");

    // // train the network
    // var learningRate = .2;
    // for (var i = 0; i < 20000; i++){
    //     for(var j = 0; j < trainData.length; j++) {
    //         myNetwork.activate([trainData[j].sd_front, trainData[j].sd_left]);
    //         myNetwork.propagate(learningRate, oneHotEncode(trainData[j]._class));
    //     }
    // }
    //
    // //test the network

    var trainer = new Trainer(myNetwork);
    // trainer.trainAsync(trainData,
    //     {rate: .1, iterations: 20000/*, error: .005, shuffle: false, cost: Trainer.cost.CROSS_ENTROPY*/}
    // ).then(results => {
    //     console.log("Done training!\n", results);
    //     done = true;
    // });

    var results = trainer.train(trainData, {rate: .2, iterations: 20000});
    console.log("Done training!\n", results);
    done = true;

    //announcer.broadcast(dataArray[0].split(",")[3]);//({nodeID: dataArray[0].split(",")[3] + "", message: "done"});
    //console.log(myNetwork.neurons());
}


var initialLoad = setInterval(function(){
    if (sensePack.size() >= minNumberOfDevices + 1) {
        clearInterval(initialLoad);
        console.log("Starting simulation...");
        if( JAMManager.isFog ) {
            sensorDataFlow = sensorDataFunc(Flow.from(sensePack));
            sensorDataFlow.setTerminalFunction(flow => processArrayData(flow.selectFlatten().select("data").collect()));
            sensorDataFlow.startPush();
            //logData();
        }
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

function selectTestData(array){
    return Flow.from(array).select(elem => {var parts = elem.split(','); return {input: [parts[0]-0, parts[1]-0], output: parts[2].replace("\n", ""), id: parts[parts.length - 1] - 0, nodeID: parts[parts.length - 2]};}).collect();
}

function logData(){//for local testing
    Flow.fromFile("sensor_readings_2.data").merge("0.0,0.0,,1,-1").forEach((line, index) => {sensePack.getMyDataStream().log(line + ",1," + index);});
}


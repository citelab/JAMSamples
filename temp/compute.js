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

    struct announcer{
        char* nodeID;
        char* message;
    } announce as broadcaster;
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

// jsync function to assign id's to devices
jsync function getId() {
    var id = ++deviceId;
    return id + "";
}

if( JAMManager.isDevice )
    console.log("device has started...");
else
    console.log("Fog has started...");

if( JAMManager.isFog ) {
    sensePack.subscribe((key, entry, stream) => {
        console.log("received", JSON.stringify(entry.log));
        // if (entry.log._class === "") {  //we have seen the end of sensor data for this stream
        //     console.log("Received end of stream marker");
        //     processForStream(stream);
        // }
        // else
        //     console.log("received ", entry.log._class);
    });
}

function sensorDataFunc(inputFlow){
    return inputFlow.discretize(Flow.from(sensePack.toIterator()).where(stream => !stream.isLocalStream).collect(), (data) => {var parts = data[0].data.split(','); return parts[2] === "" || parts[2] === "_"});
}

function processForStream(stream){
    console.log("Stream size:", stream.size());
    console.log(stream.get_value_at(0));
    //get all the data from the stream
    //var dataArray = Flow.from(stream).select("log").where(data => data._class !== "").collect();
    //console.log(dataArray.length);
    // var randomizedDataArray = randomizeData(dataArray);
    // var trainData = selectTrainData(randomizedDataArray);
    // var testData = selectTestData(randomizedDataArray);
    //
    // // create the network
    // var inputLayer = new Layer(2);
    // var hiddenLayer = new Layer(2);
    // var outputLayer = new Layer(5);
    //
    // inputLayer.project(hiddenLayer);
    // hiddenLayer.project(outputLayer);
    //
    // console.log("Got here");
    //
    // var myNetwork = new Network({
    //     input: inputLayer,
    //     hidden: [hiddenLayer],
    //     output: outputLayer
    // });
    //
    // console.log("Also got here");
    //
    // // // train the network
    // // var learningRate = .2;
    // // for (var i = 0; i < 20000; i++){
    // //     for(var j = 0; j < trainData.length; j++) {
    // //         myNetwork.activate([trainData[j].sd_front, trainData[j].sd_left]);
    // //         myNetwork.propagate(learningRate, oneHotEncode(trainData[j]._class));
    // //     }
    // // }
    // //
    // // //test the network
    //
    // var trainer = new Trainer(myNetwork);
    // trainer.train(trainData, {rate: .2});
    //
    // announce.broadcast({nodeID: stream[0].log.nodeID + "", message: "done"});
    // console.log("Done training!");
    //
    // console.log(myNetwork.neurons());
}

function processArrayData(dataArray){
    //remove the marker/delimiter
    dataArray.splice(dataArray.length - 1);

    console.log("First element is", dataArray[0]);
    var randomizedDataArray = randomizeData(dataArray);
    var trainData = selectTrainData(randomizedDataArray);
    //var testData = selectTestData(randomizedDataArray);

    // create the network
    var inputLayer = new Layer(2);
    var hiddenLayer = new Layer(2);
    var outputLayer = new Layer(5);

    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    //console.log("Got here");

    var myNetwork = new Network({
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
    trainer.train(trainData, {rate: .2});

    console.log("Done training!");

    announce.broadcast({nodeID: dataArray[0].split(",")[3] + "", message: "done"});
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
        console.log("Waiting for devices to become available...");
    }
}, 1000);

function oneHotEncode(direction){
    switch(direction){
        case "Move-Forward": return [1, 0, 0, 0, 0];
        case "Sharp-Right-Turn": return [0, 1, 0, 0, 0];
        case "Slight-Right-Turn": return [0, 0, 1, 0, 0];
        case "Sharp-Left-Turn": return [0, 0, 0, 1, 0];
        case "Slight-Left-Turn": return [0, 0, 0, 0, 1];
    }
    return [0,0,0,0,0];
}

function oneHotDecode(array){
    var index = 0;
    for( var i = 0; i < array.length; i++ ){
        if( parseInt(array[i]) === 1 ){
            index = i;
            break;
        }
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

function selectTrainData(array){//75 percents of the data
    console.log(Math.ceil(75 * array.length / 100), array.length);
    return Flow.from(array).limit(Math.ceil(75 * array.length / 100)).select(elem => {var parts = elem.split(','); return {input: [parts[0]-0, parts[1]-0], output: oneHotEncode(parts[2])};}).collect();
}

function selectTestData(array){//25 percent of the data
    return Flow.from(array).skip(Math.ceil(75 * array.length / 100)).select(elem => {var parts = elem.split(','); return {input: [parts[0]-0, parts[1]-0], output: oneHotEncode(parts[2])};}).collect();
}

function logData(){//for local testing
    Flow.fromFile("sensor_readings_2.data").merge("0.0,0.0,,1,-1").forEach((line, index) => {sensePack.getMyDataStream().log(line + ",1," + index);});
}


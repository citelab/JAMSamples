jdata{
    struct sensorData{
        float sd_front;
        float sd_left;
        char* _class;
        int nodeID;
    } sensorData as logger(fog);

    //sensorDataFlow as flow of sensorData
    struct announcer{
        char* nodeID;
        char* message;
    } announce as broadcaster;
}

jcond{
    isFog: sys.type == "fog";
}

var synaptic = require('synaptic');
var Neuron = synaptic.Neuron,
    Layer = synaptic.Layer,
    Network = synaptic.Network,
    Trainer = synaptic.Trainer;

var directions = ['Move-Forward', 'Sharp-Right-Turn', 'Slight-Right-Turn', 'Sharp-Left-Turn', 'Slight-Left-Turn'];
var minNumberOfDevices = 1;//just once device sensor is available now.
var deviceId = 0;

// jsync function to assign id's to devices
jsync function getId() {
    var id = ++deviceId;
    return id + "";
}

sensorData.subscribe((key, entry, stream) => {
    if( entry.log._class === "" )   //we have seen the end of sensor data for this stream
        processForStream(stream);
    else
        console.log("received data");
});

function processForStream(stream){
    //get all the data from the stream
    var dataArray = Flow.from(stream).select("log").where(data => data._class !== "").collect();
    var randomizedDataArray = randomizeData(dataArray);
    var trainData = selectTrainData(randomizedDataArray);
    var testData = selectTestData(randomizedDataArray);

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

    announce.broadcast({nodeID: stream[0].log.nodeID + "", message: "done"});
    console.log("Done training!");

    console.log(myNetwork.neurons());
}



// var initialLoad = setInterval(function(){
//     if (deviceId >= minNumberOfDevices) {
//         clearInterval(initialLoad);
//         console.log("Number of devices available: " + deviceId);
//         console.log("Starting simulation...");
//     }
//     else {
//         console.log("Waiting for devices to become available...");
//     }
// }, 1000);

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
    return Flow.from(array).limit(Math.ceil(75 * array.length / 100)).select(elem => {return {input: [elem.sd_front, elem.sd_left], output: oneHotEncode(elem._class)};}).collect();
}

function selectTestData(array){//25 percent of the data
    return Flow.from(array).skip(Math.ceil(75 * array.length / 100)).select(elem => {return {input: [elem.sd_front, elem.sd_left], output: oneHotEncode(elem._class)};}).collect();
}
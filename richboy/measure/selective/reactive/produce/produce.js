jdata{
    char* heartRate as logger;
    char* heartRate2 as logger;
    filterFlow as flow with filterFlowFunc of heartRate;
}

var myStream = heartRate2.getMyDataStream();

filterFlow.setTerminalFunction(forwardData);

if( JAMManager.isDevice )
    filterFlow.startPush();

var filtered = new OutFlow(Flow.from(myStream), JAMManager);
filtered.setName("filtered");

if( JAMManager.isDevice ) {
    console.log("device has started...");
    heartRate.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
    console.log("Tag is: ", jsys.tags);
}
else
    console.log("Fog has started...");


function filterFlowFunc(inputFlow){
    return inputFlow.select("data").where(line => {
        var parts = line.split(",");
        return parseInt(parts[2]) > 100;
    });
}

if( JAMManager.isFog ){
    filtered.start();
    heartRate2.subscribe(function (key, entry, stream) {
        if( stream.getKey() == myStream.getKey() )
            return;
        console.log("received:", entry.log);
    });
}

var initialLoad = setInterval(function(){
    if (heartRate.size() > 1 || heartRate2.size() > 1) {
        clearInterval(initialLoad);
        console.log("Starting simulation...");
    }
    else {
        console.log("Waiting for devices to become available...", heartRate.size());
    }
}, 1000);

function forwardData(input){
    myStream.log(input);
}
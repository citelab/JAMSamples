jdata{
    char* heartRate as logger;
}

var myStream = heartRate.getMyDataStream();

var filtered = new OutFlow(Flow.from(myStream), JAMManager);
filtered.setName("filtered");

var queue = [];
var INTERVAL = 5000;    //every 5 seconds we do analytics on the queued data

if( JAMManager.isDevice ) {
    console.log("device has started...");
    heartRate.setTransformer((input) => input.replace(/\s/g, '').replace('\n', ""));
    console.log("Tag is: ", jsys.tags);
}
else
    console.log("Fog has started...");


if( JAMManager.isFog ){
    filtered.start();
    heartRate.subscribe(function (key, entry, stream) {
        console.log("received:", entry.log);

        queue.push(entry.log);
    });
}

var initialLoad = setInterval(function(){
    if (heartRate.size() > 1) {
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

function doFilter(){
    var copy = queue.concat([]);
    queue = [];
    Flow.from(copy).where(line => {
        var parts = line.split(",");
        return parseInt(parts[2]) > 100;
    }).forEach(elem => forwardData(elem));
}

if( JAMManager.isFog )
    setInterval(doFilter, INTERVAL);
//This app should be runnable at the fog and cloud levels
//We will receive the data and use jview to visualize the activities and/or query statistics

var express, socket, alldata = [], clients = {}, carEvents = {};

jdata{
    allocIn as inflow;// of app://allocating.allocatingOut;
    carEventIn as inflow;// of app://car.carEventOut;

    //sorts of replicates the spot struct in sensor.js
    struct spots{
        char* label;           //parking spot label
        int lotID;
        int spotID;
        char* address;
        char* facilityName;
        char* facilityType;
        char* weekdayAllowedTime;
        char* saturdayAllowedTime;
        char* sundayAllowedTime;
        float rate1hr;
        float rate2hr;
        float rate3hr;
        float rateAllday;
        int isForDisabled;
        float latitude;
        float longitude;
        char* occupancyStatus;             //free, onhold, assigned
        char* occupancyCar;
        char* key;              //the stream key
    } spots as logger(cloud);

    struct activity{
        float latitude;
        float longitude;
        char* status;
        char* carID;
        float northAngle;
        float speed;
        char* key;
    }activity as logger(cloud);
}

allocIn.openFlow("allocatingOut");
carEventIn.openFlow("carEventOut");

var deviceMap = {}, carMap = {};

express = (require('express'))();
var server = require('http').createServer(express);
socket = require('socket.io')(server);
socket.on('connection', function(client){
    clients[client.id] = {connected: true, client: client, queue: [], events: []};
    console.log("client connected");
    //send all the available data when a client connects
    if( alldata.length > 0 ){
        for( var i in alldata )
            client.emit("state", alldata[i]);
    }

    var keys = Object.keys(carEvents);
    for(var i in keys)
        client.emit("carEvent" , carEvents[keys[i]]);


    client.on('all', function(){
        if( alldata.length > 0 ){
            for( var i in alldata )
                client.emit("state", alldata[i]);
        }
    });
    client.on('disconnect', function(){
        console.log("client disconnected");
        clients[client.id].connected = false;
    });
    client.on('reconnect', function(){
        console.log("client reconnected");
        clients[client.id].connected = true;
        var queue = clients[client.id].queue;
        if( queue.length > 0 ){
            for( var i in queue )
                client.emit("state", queue[i]);
            clients[client.id].queue = [];
        }
        var events = clients[client.id].events;
        if( events.length > 0 ){
            for( var i in events )
                client.emit("carEvent", events[i]);
            clients[client.id].events = [];
        }
    });
});

server.on('listening', (e) => {
    console.log("VISUAL-" + JAMManager.getLevelCode().toUpperCase() + ":", server.address().port);
});

server.on('error', (e) => {
    if (e.code == 'EADDRINUSE') {
        console.log('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(0);   //Let the system assign a port
        }, 100);
    }
});

//JAMManager.port
var port = jsys.getRedis() || jsys.getMQTT();   //try with Redis and then use MQTT if it fails
port = port.port - 0 + 1;
server.listen(port);    //get the data depot port and add one to it

express.get("/", (req, res) => res.sendFile(__dirname + "/visualizer.html"));
express.get("/*", (req, res) => res.sendFile(__dirname + req.url));


allocIn.setTerminalFunction(function(data){
    //console.log("Status is: ", data.status);

    if( JAMManager.isFog ){//log data to cloud visualizer
        if (typeof data === "string") {
            console.log("allocIn input data in visualizer.js is string");
            data = JSON.parse(data);
        }
        //console.log(data.key);

        //check that this message has a valid key else skip it.
        if (data.key === "null") {
            console.log("RETURNING...key is null");
            return;
        }

        var datastream = deviceMap[data.key];
        if (!datastream) {   //this stream doesn't yet exist so create a new one
            datastream = spots.addDatastream(data.key);
            deviceMap[data.key] = datastream;
        }
        datastream.log(data);   //let it propagate to the cloud
    }

    emitAllocationEvents(data);
});

carEventIn.setTerminalFunction(function(data){
    //console.log("Car Event is: ", data);

    if( JAMManager.isFog ){//log data to cloud visualizer
        if (typeof data === "string") {
            console.log("carEventIn input data in visualizer.js is string");
            data = JSON.parse(data);
        }
        //console.log(data.key);

        //check that this message has a valid key else skip it.
        if (data.key === "null") {
            console.log("RETURNING...key is null");
            return;
        }

        var datastream = carMap[data.key];
        if (!datastream) {   //this stream doesn't yet exist so create a new one
            datastream = activity.addDatastream(data.key);
            carMap[data.key] = datastream;
        }
        datastream.log(data);   //let it propagate to the cloud
    }

    emitCarEvents(data);
});

function emitAllocationEvents(data){
    var keys = Object.keys(clients);
    var clientObject;
    for(var i in keys){
        clientObject = clients[keys[i]];
        if( clientObject.connected )
            clientObject.client.emit("state", data);
        else
            clientObject.queue.push(data);
    }
    alldata.push(data);
}

function emitCarEvents(data){
    var keys = Object.keys(clients);
    var clientObject;
    for(var i in keys){
        clientObject = clients[keys[i]];
        if( clientObject.connected )
            clientObject.client.emit("carEvent", data);
        else
            clientObject.events.push(data);
    }
    carEvents[data.carID] = data;   //save only the current status
}

if( JAMManager.isCloud ){
    spots.subscribe((key, entry, stream) => {
        emitAllocationEvents(entry.log);
    });
    activity.subscribe((key, entry, stream) => {
        emitCarEvents(entry.log);
    });
}
//This App is available up to the fog so it can use data sharing
//when a car need to make a request, it will send the query through the fog using logging


var express, socket, clientSocket, carID;

jdata{
    struct request{
        int messageType;            //1=request, 2=accept, 3=reject, 4=leave (this should be detectable by the sensor ideally)
        char* occupancyCar;                //The id of the car sending the request
        float loc_latitude;         //The current car location
        float loc_longitude;        //
        float park_latitude;        //The requesting park location. If message is not 1, it is the rejected or accepted area
        float park_longitude;
        int maxDistance;            //The maximum allowed distance that is allowed to find a spot
        int duration;               //minimum duration in minutes that the car requires for parking
        float maxCost;              //the maximum allowed cost the user is willing to pay
        int allowSuggestions;       //if this car is open to nearby location
        int lotID;
        int spotID;                 //This for messageType 2 and 3
    } request as logger(fog);      //This logger does not go beyond the fog

    carRequestOut as outflow of request;
    allocCarAssignIn as inflow; //of app://allocating.allocResponseOut;  //inflow from the allocation app reporting slot information
    struct resp{
        int messageType;    //1=found a slot, 2=no slot found
        char* label;        //The label of the assigned spot
        char* lotID;
        char* spotID;       //the assigned id of this spot
        char* occupancyCar;        //The if for the requesting car would just be passed back with the data
        char* address;
        char* facilityName;
        float latitude;
        float longitude;
        float cost;
        float distance;
        int duration;       //The allowed maximum parking duration
        int isSuggestion;
    } resp as broadcaster;

}

allocCarAssignIn.openFlow("allocResponseOut");
carRequestOut.setName("carRequestOut");

var simSpeed = 100; //the simulation speed
var currentSpot, tempSpot;
var file = jsys.tags;   //This is the file that will be read from which the car will get it's simulation details

var Simulation = require('./sim');


jcond{
    isDevice: jsys.type == "device";
    isFog: jsys.type == "fog";
}

jsync {isDevice} function getCarID() {
    console.log("--- IN GET CAR ID FUNCTION ---");
    if( !carID )
        carID = ("car" + new Date().getTime() + Math.random()).replace(/\./g, "");
    return carID;
}

var CarActions = (function(){

    return {
        request: function(data){
            request.getMyDataStream().log(data);
        },
        accept: function(data){
            currentSpot = tempSpot;
            request.getMyDataStream().log(data);
        },
        reject: function(data){
            tempSpot = null;
            request.getMyDataStream().log(data);
        },
        leave: function(data){
            currentSpot = null;
            request.getMyDataStream().log(data);
        },
        changeLocation: function(longitude, latitude){
            jsys.setLong(longitude);
            jsys.setLat(latitude);
        },
        getCarID: function(){
            return carID;
        }
    };
})();


var simulation = null;

//jasync {isDevice} function launch(){} //this method is only available at the device level
if( JAMManager.isDevice ){
    //generate car id
    if( !carID )
        carID = ("car" + new Date().getTime() + Math.random()).replace(/\./g, "");

    //TODO adjust car user interface options later
    // express = (require('express'))();
    // var server = require('http').createServer(express);
    // socket = require('socket.io')(server);
    // socket.on('connection', function(client){
    //     clientSocket = client;
    //     console.log("client connected");
    //     client.emit("id", {carID: carID, currentSpot: currentSpot});
    //     client.on('reconnect', function(){
    //         console.log("client reconnected");
    //         client.emit("id", {carID: carID, currentSpot: currentSpot});
    //     });
    //     client.on('disconnect', function(){
    //         console.log("client disconnected");
    //     });
    //     client.on('request', function(data){//request for parking spot
    //         request.getMyDataStream().log(data);   //since there exists only one c at the device level. One pair for each car
    //     });
    //     client.on('accept', function(data){//accept parking spot
    //         currentSpot = tempSpot;
    //         //park(currentSpot.postcode, currentSpot.label);
    //         request.getMyDataStream().log(data);   //since there exists only one c at the device level. One pair for each car
    //     });
    //     client.on('reject', function(data){//reject parking spot
    //         tempSpot = null;
    //         request.getMyDataStream().log(data);   //since there exists only one c at the device level. One pair for each car
    //     });
    //     client.on('leave', function(data){//leave parking spot. Ideally this should not be the case
    //         currentSpot = null;
    //         request.getMyDataStream().log(data);   //since there exists only one c at the device level. One pair for each car
    //     });
    // });
    // //JAMManager.port
    // server.listen(jsys.getMQTT().port - 0 + 1);    //get the data depot port and add one to it
    //
    // express.get("/", (req, res) => res.sendFile(__dirname + "/car.html"));
    // express.get("/*", (req, res) => res.sendFile(__dirname + req.url));


    //since the broadcast at the C is not yet working, for now lets use J->C when we get to the device level
    resp.addHook(function(pack){
        if( pack.origin === "parent" ){//only pay attention to broadcasts from the fog
            console.log("IN BROADCAST HOOK FOR DEVICE");
            var message = pack.message;
            //since this is a broadcast, check if it concerns this node
            if( message.occupancyCar != carID )
                return;

            //check if the allocator found a spot for us
            if( message.messageType == 2 ){ //no spot was found
                //send to visualizer to process
                //clientSocket.emit("response", message);
                console.log("NO SPOT WAS FOUND!!!");
                return;
            }

            //determine if the found spot is the preferred. If it is, then do the parking
            //else check if the postcode of the new area is close to where we want. If it is, we accept else we reject

            if( message.isSuggestion == 0 ){//this is our preferred area
                currentSpot = message;  //save as current spot
                //park(message.postcode, message.label);  //send to the C-side
                //send to visualizer to process
                //clientSocket.emit("response", message);
                //save spot information
                simulation.saveParking(currentSpot);
            }
            else{//this is not our preferred location
                //save the temporary spot in case the user accepts it
                tempSpot = message;
                //send to visualizer to process
                //clientSocket.emit("response", message);
                setTimeout(function(){
                    //for now randomly accept
                    //TODO check distance between current location and cost
                    var pos = Math.floor(Math.random() * 2);
                    var data = {
                        messageType: 2, //accept
                        occupancyCar: tempSpot.occupancyCar,
                        loc_latitude: tempSpot.latitude,
                        loc_longitude: tempSpot.longitude,
                        park_latitude: tempSpot.latitude,
                        park_longitude: tempSpot.longitude,
                        maxDistance: tempSpot.distance,
                        duration: tempSpot.duration,
                        maxCost: tempSpot.cost, //10 dollars for now
                        allowSuggestions: 0,
                        lotID: tempSpot.lotID,
                        spotID: tempSpot.spotID
                    };

                    if( pos == 0 ) {  //accept
                        CarActions.accept(data);
                    }
                    else{//reject
                        data.messageType = 3;   //reject

                        CarActions.reject(data);
                    }
                }, 3000 / simSpeed);
            }
        }
    });
}

//setTimeout(launch, 2000);    //begin running code at the device level
if( JAMManager.isFog )
    carRequestOut.setExtractDataTransformer().start();  //start the outflow to listen and send data out to allocator


//no need to use jcond to make this function run only at the fog level because no sharing will be done by the
//allocator at the device level
allocCarAssignIn.setTerminalFunction(function(data){
    if( typeof data === "string" ){
        console.log("allocCarAssignIn input data in car.js is string");
        data = JSON.parse(data);
    }
    //TODO data received, use J->J to send the data to the level below
    //For now let us use broadcaster to push the data down
    resp.broadcast(data);   //data should have the structure in the resp struct
});

//start simulation
if( JAMManager.isDevice ){
    //read file and build simulation
    var fileFlow = Flow.fromFile('./taxi_data/' + file);

    simulation = new Simulation(fileFlow, simSpeed, 20, CarActions);
    simulation.start();
}
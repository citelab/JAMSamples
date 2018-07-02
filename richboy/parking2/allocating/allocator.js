/**
 * Created by Richboy on 29/06/17.
 */
jdata{
    sensingIn as inflow;// of app://sensing.sensingOut;
    carRequestIn as inflow;// of app://car.carRequestOut;

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
    } spots as logger;

    //NOTE: freeSpots does NOT listen for events from the flow, it uses manual push for faster processing
    freeSpots as flow with freeSpotsFlow of spots;  //available parking spots

    struct alloc{
        char* label;            //parking spot label
        char* occupancyStatus;   //assigned, onhold, free
        char* occupancyCar;      //The binding car
        int lotID;
        int spotID;
        char* address;
        char* facilityName;
        float latitude;
        float longitude;
        char* key;
    } alloc as logger; //NOT SURE YET if we may need to restrict this to fog alone

    allocFlow as flow with flowFunc of alloc;
    allocSenseOut as outflow of allocFlow;  //outflow for sensor.js

    struct assign{
        int messageType;    //1=found a slot, 2=no slot found
        char* label;        //The label of the assigned spot
        char* lotID;        //The id of the lot where the spot is located
        char* spotID;       //the id of this spot
        char* occupancyCar; //The if for the requesting car, the car ID would just be passed back with the data
        char* address;
        char* facilityName;
        float latitude;
        float longitude;
        float cost;
        float distance;
        int duration;       //The allowed maximum parking duration
        int isSuggestion;
    } assign as logger; //NOT SURE YET if we may need to restrict this to fog alone

    assignFlow as flow with flowFunc of assign;
    allocResponseOut as outflow of assignFlow;  //outflow for car.js

    //this is the request from fog to cloud when the fog is unable to find an optimal parking spot for a car
    struct requestCloud{
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
        float distance;             //This is the best distance the fog can produce. The cloud will check if it can best it.
    } requestCloud as logger(cloud);

    //this will be the response from the cloud about a request sent from the fog for car allocation to parking spot
    //It should have a combination of the assign struct and the requestCloud struct because the fog will need to
    //identify the request and also receive any suggestion which it can assign and send
    struct responseCloud{
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
        char* label;
        int lotID;
        int spotID;                 //This for messageType 2 and 3
        float distance;             //This is the best distance the fog can produce. The cloud will check if it can best it.
        char* address;
        char* facilityName;
        float latitude;
        float longitude;
        float cost;
        int isSuggestion;
    } responseCloud as broadcaster;
}

function flowFunc(inputFlow){
    return inputFlow;
}

sensingIn.openFlow("sensingOut");
carRequestIn.openFlow("carRequestOut");
allocSenseOut.setName("allocSenseOut");
allocResponseOut.setName("allocResponseOut");

//TODO add a functionality where a fog sends a request to the cloud for free spot information on other fogs
//TODO Also, check if this fog manages the postcode that is in the preferred request before assigning one, else ask the cloud to find the fog

//keep track of spots that a car has rejected. So that when they re-request, we won't end up sending same spot to them
var carRejects = {};
var deviceMap = {}; //to optimize finding devices as opposed to looping with arrays when the number of devices grow large
var cloudShare; //The cloud outflow to visualizer
//format: {key: {data: {...}, best: {}}} (data is the raw request from the car, best is the best the spot found)
var pendingRequests = {};   //requests that the fog has to wait on the cloud to get a better response


if( JAMManager.isFog ) {
    //read the data passed in from the sensing application. This should only work in the Fog
    sensingIn.setTerminalFunction(function (data) {
        if (typeof data === "string") {
            console.log("sensingIn input data in allocator.js is string");
            data = JSON.parse(data);
        }
        //console.log(data.key);

        //check that this message has a valid key else skip it.
        if (data.key === "null") {
            console.log("RETURNING...key is null");
            return;
        }

        //find device stream
        var datastream = deviceMap[data.key];

        if (!datastream) {   //this stream doesn't yet exist so create a new one
            datastream = spots.addDatastream(data.key);
            datastream.setTransformer(input => {
                input[jsys.type] = JAMManager.deviceID;
                return input;
            });
            deviceMap[data.key] = datastream;
            deviceMap[data.lotID + "_" + data.spotID] = datastream;    //save this reference as well as that of the key's
            new OutFlow(Flow.from(datastream)).setName("allocatingOut").setTransformer(input => {
                input = input.data;
                input[jsys.type] = JAMManager.deviceID;
                return input;
            }).start();    //create and start an outflow to listen for data
        }

        //log the data on this stream
        datastream.log(data);   //let it propagate to the cloud
        freeSpots.push(data);
    });

    //implement logic to request allocation from the cloud when no spot is found and receive broadcast of cloud responses
    carRequestIn.setTerminalFunction(function f(data) {
        if (typeof data === "string") {
            console.log("carRequestIn input data in allocator.js is string");
            try {
                data = JSON.parse(data);
            }
            catch (e) {
                console.error(e);
            }
        }
        if (data.messageType === undefined) {
            console.log(data);
            return;
        }

        console.log("IN CAR REQUEST FUNCTION", data.messageType - 0);
        switch (data.messageType - 0) {
            case 1: //request

                if (freeSpots.getCustomResult() == null) {
                    console.log("Custom Result is null ");
                    setTimeout(() => f(data), 500);
                    return;
                }

                var objects = freeSpots.getCustomResult();  //computed free slots
                var keys = Object.keys(objects);

                //TODO factor in maximum cost and parking duration later to find
                var spot = Flow.from(keys)
                    .select(key => objects[key])
                    .where(obj => calculateDistance(obj.latitude, obj.longitude, data.park_latitude, data.park_longitude) <= data.maxDistance)
                    .findFirst();

                if (!spot) { //we could not find any spot
                    //prepare a request to the cloud to see if the cloud can best our distance
                    var newData = Object.assign(data, {distance: -1});
                    var object = {data: data, best: null};

                    //so we check for a spot that is nearby if the user has indicated that option
                    if (data.allowSuggestions == 1) {
                        //TODO factor in maximum cost and parking duration later to find
                        spot = Flow.from(keys)
                            .select(key => objects[key])
                            // .where(obj => { //ignore all those the car has rejected
                            //     if( carRejects[data.occupancyCar] )
                            //         return !carRejects[data.occupancyCar][obj.postcode];
                            //     return true;
                            // })
                            .orderBy(function (spot1, spot2) {
                                var d1 = calculateDistance(spot1.latitude, spot1.longitude, data.park_latitude, data.park_longitude);
                                var d2 = calculateDistance(spot2.latitude, spot2.longitude, data.park_latitude, data.park_longitude);
                                return d1 - d2;
                            })
                            .findFirst();

                        if (spot != null) {
                            newData.distance = calculateDistance(spot.latitude, spot.longitude, data.park_latitude, data.park_longitude);
                            object.best = spot;
                        }
                    }
                    //save request from car till we get back info from the cloud
                    pendingRequests[data.occupancyCar] = object;
                    //send the request to the cloud
                    requestCloud.getMyDataStream().log(newData);
                }
                else {//We found a free spot. send spot to car
                    assign.getMyDataStream().log({
                        messageType: 1,
                        label: spot.label,
                        spotID: spot.spotID,
                        lotID: spot.lotID,
                        address: spot.address,
                        occupancyCar: data.occupancyCar,
                        facilityName: spot.facilityName,
                        latitude: spot.latitude,
                        longitude: spot.longitude,
                        distance: calculateDistance(spot.latitude, spot.longitude, data.park_latitude, data.park_longitude),
                        cost: 0,    //TODO add this
                        duration: 0,    //TODO add this
                        isSuggestion: 0
                    });

                    var datastream = deviceMap[spot.lotID + "_" + spot.spotID];    //find the datastream
                    //log the changes so it can also be shared on the outflow channel
                    console.log("waiting...");
                    datastream.getLastValueSync().then(log => {
                        console.log("done waiting...");
                        log.occupancyStatus = "occupied";
                        log.occupancyCar = data.occupancyCar;
                        console.log(log);
                        datastream.log(log);
                        freeSpots.push(log);
                        //share this on the channel that sensing is listening on
                        alloc.getMyDataStream().log({
                            occupancyStatus: "occupied",
                            label: spot.label,
                            occupancyCar: data.occupancyCar,
                            spotID: spot.spotID,
                            lotID: spot.lotID,
                            address: spot.address,
                            facilityName: spot.facilityName,
                            latitude: spot.latitude,
                            longitude: spot.longitude,
                            key: spot.key
                        });
                    });

                }

                break;
            case 2: //accept
                var datastream = deviceMap[data.lotID + "_" + data.spotID];    //find the datastream

                //check if this spot is under our jurisdiction
                if( !datastream ){//it probably must have been from the cloud request; or another fog and the car moved here
                    var bundle = pendingRequests[data.occupancyCar];

                    if( bundle ) //check if we requested this spot from the cloud
                        delete pendingRequests[data.occupancyCar]; //we no longer need this again since the car is leaving

                    //even if we do not know about it or its from the cloud request, send to the cloud to send to owner
                    requestCloud.getMyDataStream().log(Object.assign(data, {distance: data.maxDistance}));
                }
                else {
                    //log the changes so it can also be shared on the outflow channel
                    datastream.getLastValueSync().then(log => {
                        log.occupancyStatus = "occupied";
                        log.occupancyCar = data.occupancyCar;
                        datastream.log(log);
                        freeSpots.push(log);
                        //share this on the channel that sensing is listening on
                        alloc.getMyDataStream().log({
                            occupancyStatus: "occupied",
                            label: log.label,
                            occupancyCar: data.occupancyCar,
                            spotID: log.spotID,
                            lotID: log.lotID,
                            address: log.address,
                            facilityName: log.facilityName,
                            latitude: log.latitude,
                            longitude: log.longitude,
                            key: log.key
                        });
                    });
                }

                break;
            case 3: //reject
                //add to rejects for this car so that when this car requests again, we will not serve this spot
                //we are adding the entire area as being rejected by this car. Area here is just a parking lot
                // var rejects;
                // if( carRejects[data.occupancyCar] )
                //     rejects = carRejects[data.occupancyCar];
                // else
                //     rejects = {};
                //
                // rejects[data.postcode] = true;
                // carRejects[data.occupancyCar] = rejects;

                //this slot is now free, so update state and inform sensor
                var datastream = deviceMap[data.lotID + "_" + data.spotID];    //find the datastream

                //check if this spot is under our jurisdiction
                if( !datastream ){//it probably must have been from the cloud request; or another fog and the car moved here
                    var bundle = pendingRequests[data.occupancyCar];

                    if( bundle ) //check if we requested this spot from the cloud
                        delete pendingRequests[data.occupancyCar]; //we no longer need this again since the car is leaving

                    //even if we do not know about it or its from the cloud request, send to the cloud to send to owner
                    requestCloud.getMyDataStream().log(Object.assign(data, {distance: data.maxDistance}));
                }
                else {
                    //log the changes so it can also be shared on the outflow channel
                    datastream.getLastValueSync().then(log => {
                        log.occupancyStatus = "free";
                        log.occupancyCar = "";
                        datastream.log(log);
                        freeSpots.push(log);
                        //share this on the channel that sensing is listening on
                        alloc.getMyDataStream().log({
                            occupancyStatus: "free",
                            label: log.label,
                            occupancyCar: "",
                            spotID: log.spotID,
                            lotID: log.lotID,
                            address: log.address,
                            facilityName: log.facilityName,
                            latitude: log.latitude,
                            longitude: log.longitude,
                            key: log.key
                        });
                    });
                }

                break;
            case 4: //leave
                //this slot is now free, so update state and inform sensor
                var datastream = deviceMap[data.lotID + "_" + data.spotID];    //find the datastream

                //check if this spot is under our jurisdiction
                if( !datastream ){//it probably must have been from the cloud request; or another fog and the car moved here
                    var bundle = pendingRequests[data.occupancyCar];

                    if( bundle ) //check if we requested this spot from the cloud
                        delete pendingRequests[data.occupancyCar]; //we no longer need this again since the car is leaving

                    //even if we do not know about it or its from the cloud request, send to the cloud to send to owner
                    requestCloud.getMyDataStream().log(Object.assign(data, {distance: data.maxDistance}));
                }
                else {
                    //log the changes so it can also be shared on the outflow channel
                    datastream.getLastValueSync().then(log => {
                        log.occupancyStatus = "free";
                        log.occupancyCar = "";
                        datastream.log(log);
                        freeSpots.push(log);
                        //share this on the channel that sensing is listening on
                        alloc.getMyDataStream().log({
                            occupancyStatus: "free",
                            label: log.label,
                            occupancyCar: "",
                            spotID: log.spotID,
                            lotID: log.lotID,
                            address: log.address,
                            facilityName: log.facilityName,
                            latitude: log.latitude,
                            longitude: log.longitude,
                            key: log.key
                        });

                        //clear rejected list for this car
                        // delete carRejects[data.occupancyCar];
                    });
                }

                break;
            default:
                console.log("DID NOT MATCH ANY CASE");
        }
    });


    //get response from the cloud and check and compare if the cloud can provide something better
    responseCloud.addHook(pack => {
        var data = pack.message;
        var datastream = deviceMap[data.lotID + "_" + data.spotID];
        var bundle = pendingRequests[data.occupancyCar];

        //check if this is in response to the my request to the cloud
        if( bundle ){
            //calculateDistance(spot.latitude, spot.longitude, data.park_latitude, data.park_longitude);
            //check if the cloud had anything to offer
            if( data.messageType == 1 ){//the cloud had something
                //send to the car
                assign.getMyDataStream().log({
                    messageType: 1,
                    label: data.label,
                    spotID: data.spotID,
                    lotID: data.lotID,
                    address: data.address,
                    occupancyCar: data.occupancyCar,
                    facilityName: data.facilityName,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    distance: data.distance,
                    cost: data.cost,    //TODO add this
                    duration: data.duration,    //TODO add this
                    isSuggestion: data.isSuggestion
                });

                var datastream = deviceMap[data.lotID + "_" + data.spotID];    //check if i am the custodian
                if( datastream ) {//What this cloud offered is under my jurisdiction. That's weird but we can take charge
                    delete pendingRequests[data.occupancyCar];  //since we are responsible for this spot

                    //log the changes so it can also be shared on the outflow channel
                    console.log("waiting...");
                    datastream.getLastValueSync().then(log => {
                        console.log("done waiting...");
                        log.occupancyStatus = "occupied";
                        log.occupancyCar = data.occupancyCar;
                        console.log(log);
                        datastream.log(log);
                        freeSpots.push(log);
                        //share this on the channel that sensing is listening on
                        alloc.getMyDataStream().log({
                            occupancyStatus: "occupied",
                            label: data.label,
                            occupancyCar: data.occupancyCar,
                            spotID: data.spotID,
                            lotID: data.lotID,
                            address: data.address,
                            facilityName: data.facilityName,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            key: datastream.getDeviceId()   //we are using this because the data object does not have the key
                        });
                    });
                }
            }
            else {  //cloud had nothing to offer
                var object = pendingRequests[data.occupancyCar];
                var spot = object.best;
                data = object.data; //ignore the data object from the cloud since it is useless
                delete pendingRequests[data.occupancyCar];  //since the cloud had nothing to offer us

                if( data.allowSuggestions == 1 && spot != null ) {
                    //send to the car
                    assign.getMyDataStream().log({
                        messageType: 1,
                        label: spot.label,
                        spotID: spot.spotID,
                        lotID: spot.lotID,
                        address: spot.address,
                        occupancyCar: data.occupancyCar,
                        facilityName: spot.facilityName,
                        latitude: spot.latitude,
                        longitude: spot.longitude,
                        distance: calculateDistance(spot.latitude, spot.longitude, data.park_latitude, data.park_longitude),
                        cost: 0,    //TODO add this
                        duration: 0,    //TODO add this
                        isSuggestion: 1
                    });

                    var datastream = deviceMap[spot.lotID + "_" + spot.spotID];    //find the datastream
                    if( !datastream )
                        console.log("Datastream is null: ", spot.lotID, spot.spotID);
                    //log the changes so it can also be shared on the outflow channel
                    datastream.getLastValueSync().then(log => {
                        log.occupancyStatus = "onhold";
                        log.occupancyCar = data.occupancyCar;
                        datastream.log(log);
                        freeSpots.push(log);
                        //share this on the channel that sensing is listening on
                        alloc.getMyDataStream().log({
                            occupancyStatus: "onhold",
                            label: spot.label,
                            occupancyCar: data.occupancyCar,
                            spotID: spot.spotID,
                            lotID: spot.lotID,
                            address: spot.address,
                            facilityName: spot.facilityName,
                            latitude: spot.latitude,
                            longitude: spot.longitude,
                            key: spot.key   //datastream.getDeviceId()
                        });
                    });
                }
                else {//if we and the cloud did not find anything, inform car that no spot was found
                    assign.getMyDataStream().log({
                        messageType: 2,
                        label: null,
                        spotID: -1,
                        lotID: -1,
                        address: null,
                        occupancyCar: data.occupancyCar,
                        facilityName: null,
                        latitude: null,
                        longitude: null,
                        distance: -1,
                        cost: -1,
                        duration: -1,
                        isSuggestion: 1
                    });
                }
            }
        }

        //check if the cloud is referring to some parking spot under my jurisdiction
        //maybe the cloud gave this parking spot out through another fog
        else if( datastream ){  //mutually exclusive cause the cloud could respond with a spot under me for my request. Let the if blobk handle that
            datastream.getLastValueSync().then(log => {
                log.occupancyStatus = data.occupancyStatus;
                log.occupancyCar = data.occupancyCar;
                datastream.log(log);
                freeSpots.push(log);
                //share this on the channel that sensing is listening on
                alloc.getMyDataStream().log({
                    occupancyStatus:  data.occupancyStatus,
                    label: data.label,
                    occupancyCar: data.occupancyCar,
                    spotID: data.spotID,
                    lotID: data.lotID,
                    address: data.address,
                    facilityName: data.facilityName,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    key: log.key
                });

                //clear rejected list for this car
                // delete carRejects[data.occupancyCar];
            });
        }
    });
}
else if( JAMManager.isCloud ){
    //implement logic to receive allocation requests from the fog and respond appropriately
    freeSpots.startPush();  //listen out for log data from the fog

    //start an outflow for all the data streams which will be created under spots
    cloudShare = new OutFlow(Flow.from(spots)).setName("allocatingOut").setTransformer(input => {
        input = input.data;
        input[jsys.type] = JAMManager.deviceID;
        return input;
    });
    cloudShare.start();

    //listen for the first sets of data from each stream and save the stream in a map for easy finding
    var listen = function(key, entry, datastream){
        var key = entry.log.lotID + "_" + entry.log.spotID;
        if( !deviceMap[key] )
            deviceMap[key] = datastream;

        datastream.unsubscribe(listen);
    };

    spots.subscribe(listen);

    requestCloud.subscribe((key, entry, stream) => {
        var data = entry.log;

        //check if this is a request for re-broadcast
        if( data.messageType != 1 ) {//all others(reject, leave, accept) apart from request
            responseCloud.broadcast(Object.assign(data, {
                label: null,
                spotID: -1,
                lotID: -1,
                address: null,
                facilityName: null,
                latitude: null,
                longitude: null,
                distance: -1,
                cost: -1,
                isSuggestion: -1
            }));
            return;
        }

        var objects = freeSpots.getCustomResult();  //computed free slots
        var keys = Object.keys(objects);

        //TODO factor in maximum cost and parking duration later to find
        var spot = Flow.from(keys)
            .select(key => objects[key])
            .where(obj => calculateDistance(obj.latitude, obj.longitude, data.park_latitude, data.park_longitude) <= data.maxDistance)
            .findFirst();

        if (!spot) { //we could not find any spot
            //so we check for a spot that is nearby if the user has indicated that option
            if (data.allowSuggestions == 1) {
                //TODO factor in maximum cost and parking duration later to find
                spot = Flow.from(keys)
                    .select(key => objects[key])
                    // .where(obj => { //ignore all those the car has rejected
                    //     if( carRejects[data.occupancyCar] )
                    //         return !carRejects[data.occupancyCar][obj.postcode];
                    //     return true;
                    // })
                    //if the distance is less than 0 (-1) then the fog did not find anything so we are free to find the shortest distance we know on the cloud
                    .where(obj => data.distance < 0 || calculateDistance(obj.latitude, obj.longitude, data.park_latitude, data.park_longitude) < data.distance) //look for something at least smaller than what the fog knows
                    .orderBy(function (spot1, spot2) {
                        var d1 = calculateDistance(spot1.latitude, spot1.longitude, data.park_latitude, data.park_longitude);
                        var d2 = calculateDistance(spot2.latitude, spot2.longitude, data.park_latitude, data.park_longitude);
                        return d1 - d2;
                    })
                    .findFirst();

                if (spot != null) {
                    //broadcast down to the fog
                    //all the fogs will receive this broadcast and those of interest will act.
                    responseCloud.broadcast(Object.assign(data, {
                        messageType: 1,
                        label: spot.label,
                        occupancyCar: data.occupancyCar,
                        spotID: spot.spotID,
                        lotID: spot.lotID,
                        address: spot.address,
                        facilityName: spot.facilityName,
                        latitude: spot.latitude,
                        longitude: spot.longitude,
                        distance: calculateDistance(spot.latitude, spot.longitude, data.park_latitude, data.park_longitude),
                        cost: 0,    //TODO add this
                        duration: 0,    //TODO add this
                        isSuggestion: 1
                    }));

                    var datastream = deviceMap[spot.lotID + "_" + spot.spotID];    //find the datastream
                    //log the changes so it can also be shared on the outflow channel
                    datastream.getLastValueSync().then(log => {
                        log.occupancyStatus = "onhold";
                        log.occupancyCar = data.occupancyCar;

                        //instead of the two calls below, we could replace it by logging to the datastream cause they are both listening on it
                        //The problem is that it will be slower. However, will there be inconsistencies on the part of the datastream entries???

                        //send directly to the push method of visualizer outflow
                        cloudShare.push(log);
                        //instantly update the running reduce
                        freeSpots.push(log);
                    });

                    return;
                }
            }

            //inform fog that no spot was found
            responseCloud.broadcast(Object.assign(data, {
                messageType: 2,
                label: null,
                spotID: -1,
                lotID: -1,
                address: null,
                occupancyCar: data.occupancyCar,
                facilityName: null,
                latitude: null,
                longitude: null,
                distance: -1,
                cost: -1,
                duration: -1,
                isSuggestion: 1
            }));
        }
        else {//We found a free spot. send spot to fog
            responseCloud.broadcast(Object.assign(data, {
                messageType: 1,
                label: spot.label,
                spotID: spot.spotID,
                lotID: spot.lotID,
                address: spot.address,
                occupancyCar: data.occupancyCar,
                facilityName: spot.facilityName,
                latitude: spot.latitude,
                longitude: spot.longitude,
                distance: calculateDistance(spot.latitude, spot.longitude, data.park_latitude, data.park_longitude),
                cost: 0,    //TODO add this
                duration: 0,    //TODO add this
                isSuggestion: 0
            }));

            var datastream = deviceMap[spot.lotID + "_" + spot.spotID];    //find the datastream
            //log the changes so it can also be shared on the outflow channel
            console.log("waiting...");
            datastream.getLastValueSync().then(log => {
                console.log("done waiting...");
                log.occupancyStatus = "occupied";
                log.occupancyCar = data.occupancyCar;
                //console.log(log);

                //send directly to the push method of visualizer outflow
                cloudShare.push(log);
                //instantly update the running reduce
                freeSpots.push(log);
            });

        }
    });
}


function freeSpotsFlow(inputFlow){
    //inputFlow.rootFlow.shouldCache = false; //we do not want the data to cache through the pipe

    return inputFlow.select("data").runningReduce({custom: (cv, nv) => {
        if( cv == null )
            return {};
        //check if the input (which is nv) is free or occupied
        if( nv.occupancyStatus === "free" )   //add to the object which is the current value
            cv[nv.key] = nv;
        else
            delete cv[nv.key]; //remove this property
        return cv;
    }});

    // return inputFlow.select(source => source.toIterator()).selectFlatten()
    //     .where(stream => !stream.isEmpty()).select(stream => stream.lastValue()).where(json => json.occupancyStatus == "free");
}


function vectorDistance(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
}

function locationDistance(location1, location2) {
    var dx = location1.latitude - location2.latitude,
        dy = location1.longitude - location2.longitude;

    return vectorDistance(dx, dy);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p))/2;

    return 12742 * Math.asin(Math.sqrt(a)) * 1000; //in metres
}

allocSenseOut.setExtractDataTransformer().start();
allocResponseOut.setExtractDataTransformer().start();
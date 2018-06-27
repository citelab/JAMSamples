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

//read the data passed in from the sensing application. This should only work in the Fog
//TODO we have to see how to make this probably run on the cloud
sensingIn.setTerminalFunction(function(data){
    if( typeof data === "string" ){
        console.log("sensingIn input data in allocator.js is string");
        data = JSON.parse(data);
    }
    console.log(data.key);

    //check that this message has a valid key else skip it.
    if( data.key === "null" ) {
        console.log("RETURNING...key is null");
        return;
    }

    //find device stream
    var datastream = deviceMap[data.key];

    if( !datastream ){   //this stream doesn't yet exist so create a new one
        datastream = spots.addDatastream(data.key);
        deviceMap[data.key] = datastream;
        deviceMap[data.lotID + "_" + data.spotID] = datastream;    //save this reference as well as that of the key's
        new OutFlow(Flow.from(datastream)).setName("allocatingOut").setTransformer(input => {input = input.data; input[jsys.type] = JAMManager.deviceID; return input;}).start();    //create and start an outflow to listen for data
    }

    //log the data on this stream
    //TODO remove one of this or ignore the event from the other
    datastream.log(data);   //let it propagate to the cloud
    freeSpots.rootFlow.push(data);
});

carRequestIn.setTerminalFunction(function f(data){
    if( typeof data === "string" ){
        console.log("carRequestIn input data in allocator.js is string");
        try {
            data = JSON.parse(data);
        }
        catch(e){
            console.error(e);
        }
    }
    if( data.messageType === undefined ) {
        console.log(data);
        return;
    }

    console.log("IN CAR REQUEST FUNCTION", data.messageType - 0);
    switch(data.messageType - 0){
        case 1: //request
            //oldfirst check for the preferred location
            if( freeSpots.getCustomResult() == null ){
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

            if( !spot ) { //we could not find any spot
                //so we check for a spot that is nearby if the user has indicated that option
                if( data.allowSuggestions == 1 ){
                    //TODO factor in maximum cost and parking duration later to find
                    spot = Flow.from(keys)
                        .select(key => objects[key])
                        // .where(obj => { //ignore all those the car has rejected
                        //     if( carRejects[data.occupancyCar] )
                        //         return !carRejects[data.occupancyCar][obj.postcode];
                        //     return true;
                        // })
                        .orderBy(function(spot1, spot2){
                            var d1 = calculateDistance(spot1.latitude, spot1.longitude, data.park_latitude, data.park_longitude);
                            var d2 = calculateDistance(spot2.latitude, spot2.longitude, data.park_latitude, data.park_longitude);
                            return d1 - d2;
                        })
                        .findFirst();

                    if( spot != null ){
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

                        var datastream = deviceMap[spot.spotID];    //find the datastream
                        //log the changes so it can also be shared on the outflow channel
                        datastream.getLastValueSync().then(log => {
                            log.status = "onhold";
                            datastream.log(log);
                            freeSpots.rootFlow.push(log);
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

                        return;
                    }
                }

                //inform car that no spot was found
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
            else{//We found a free spot. send spot to car
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

                var datastream = deviceMap[spot.spotID];    //find the datastream
                //log the changes so it can also be shared on the outflow channel
                console.log("waiting...");
                datastream.getLastValueSync().then(log => {
                    console.log("done waiting...");
                    log.status = "occupied";
                    console.log(log);
                    datastream.log(log);
                    freeSpots.rootFlow.push(log);
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
            var datastream = deviceMap[data.slotID];    //find the datastream
            //log the changes so it can also be shared on the outflow channel
            datastream.getLastValueSync().then(log => {
                log.status = "occupied";
                datastream.log(log);
                freeSpots.rootFlow.push(log);
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
            var datastream = deviceMap[data.slotID];    //find the datastream
            //log the changes so it can also be shared on the outflow channel
            datastream.getLastValueSync().then(log => {
                log.status = "free";
                datastream.log(log);
                freeSpots.rootFlow.push(log);
                //share this on the channel that sensing is listening on
                alloc.getMyDataStream().log({
                    status: "free",
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

            break;
        case 4: //leave
            //this slot is now free, so update state and inform sensor
            var datastream = deviceMap[data.slotID];    //find the datastream
            //log the changes so it can also be shared on the outflow channel
            datastream.getLastValueSync().then(log => {
                log.status = "free";
                datastream.log(log);
                freeSpots.rootFlow.push(log);
                //share this on the channel that sensing is listening on
                alloc.getMyDataStream().log({
                    status: "free",
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

                //clear rejected list for this car
                delete carRejects[data.occupancyCar];
            });

            break;
        default: console.log("DID NOT MATCH ANY CASE");
    }
});


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
    //     .where(stream => !stream.isEmpty()).select(stream => stream.lastValue()).where(json => json.status == "free");
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
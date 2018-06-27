/**
 * Created by Richboy on 30/06/17.
 */

jdata{
    struct spot{
        char* label;           //parking label
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
    } spot as logger(cloud);      //This logger goes all the way to the cloud

    spotFlow as flow with spotFlowFunc of spot;
    sensingOut as outflow of spotFlow;
    allocSensorIn as inflow;// of app://allocating.allocSenseOut;

    struct assignment{
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
    } assignment as broadcaster;
}

sensingOut.setName("sensingOut");
allocSensorIn.openFlow("allocSenseOut");

// //Since we are having a lil issue with getting the device JNode to send back data using C->J, lets transform
// //the data before it is sent to the fog and onwards
// if( jsys.type == "device" ){
//     spot.setTransformer((input, datastream) => {
//         input.key = datastream.getDeviceId();
//         input.postcode = postcodes[input.assignedID - 1];
//         input.label = labels[input.assignedID - 1];
//         input.address = addresses[0];
//         return input;
//     });
// }

jcond{
    isFog: jsys.type == "fog";
    isDevice: jsys.type == "device";
}

//function to share the data at the fog and cloud levels
if( !JAMManager.isDevice ){
    sensingOut.setExtractDataTransformer().start(); //start sharing on the fog and cloud
    //sensingOut.start();
}


function spotFlowFunc(inputFlow){
    return inputFlow;
}


jsync {isDevice} function getStreamKey(spotID) {//
    console.log("SpotID is ", spotID);
    //use the assigned id to find the datastream and return the key
    for( var i = 0; i < spot.size(); i++ ){
        var lastValue = spot[i].getLastValue();
        if( lastValue == null )
            continue;
        if( lastValue.spotID && lastValue.spotID == spotID ) {
            console.log("Found Stream Key");
            return spot[i].getDeviceId();
        }
    }
    console.error("Did not find Stream Key");
    return "null";
}

function addBroadcastHook(){
    //since the broadcast at the C is not yet working, for now lets use J->C when we get to the device level
    assignment.addHook(function(pack){
        if( pack.origin === "parent" ){//only pay attention to broadcasts from the fog
            var message = pack.message;
            //since this is a broadcast, check if it concerns this node
            var datastream = null;

            for( var i = 0; i < spot.size(); i++ ){
                if( spot[i].getDeviceId() == message.key ){
                    datastream = spot[i];
                    break;
                }
            }
            if( datastream == null )
                return;

            //inform the c-side of the state change
            changeState(message.occupancyStatus, message.occupancyCar, message.spotID, message.lotID);
        }
    });
}

//spot.findAllStreams();  //get all the streams from Redis which may not yet be loaded in memory

// //subscribe to when parent comes online and then push the last data from all the streams, but only one that is not null
// var subObj = {
//     func: function(info, redis, parentLevel){
//         if( parentLevel === "fog" ){ //this will execute only on the device
//             JAMManager.removeParentUpSub(subObj);   //only do this on oldfirst connection
//
//             //setup the device to only push values having the required key to the fog
//             for(var i = 0; i < spot.size(); i++){
//                 (function(dSpot){
//                     var poll = function(s){
//                         if( s.getLastValue() == null ||  s.getLastValue().key == "null" )
//                             setTimeout(() => poll(s), 100);
//                         else
//                             JAMManager.simpleLog(s.key, s.getLastValue(), null, JAMManager.getParentRedisLogger());
//                     };
//                     poll(dSpot);
//                 })(spot[i]);
//             }
//         }
//     },
//     context: null
// };
//
// JAMManager.addParentUpSub(subObj);

//no need to use jcond to make this function run only at the fog level because no sharing will be done by the
//allocator at the device level
allocSensorIn.setTerminalFunction(function(data){
    if( typeof data === "string" ){
        console.log("allocSensorIn input data in sensor.js is string");
        data = JSON.parse(data);
    }
    //TODO data received, use J->J to send the data to the level below
    //For now let us use broadcaster to push the data down
    assignment.broadcast(data);   //data should have the structure in the response struct
});

if( JAMManager.isDevice )
    addBroadcastHook();
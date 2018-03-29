jcond{
    isFog: sys.type == "fog";
    isDevice: sys.type == "device";
}

var deviceId = 1000;
var PROCESS_COUNT = 1;

// jsync function to assign id's to devices
jsync {isFog} function getId() {
    var id = ++deviceId;
    return id + "";
}

jsync {isDevice} function getPayload() {
    return PROCESS_COUNT;
}

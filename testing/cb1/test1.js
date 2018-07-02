
var mymsg = "hello from controller";

jasync function printMsg(msg, cb) {
    console.log("Message from worker: " + msg);
    cb(mymsg);
}

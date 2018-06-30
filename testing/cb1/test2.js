
var mymsg = "hello from controller";

jasync function printMsg(msg) {
    console.log("Message from worker: " + msg);
    printRet(mymsg);
}


jdata {
    int y as broadcaster;
    int z as broadcaster;
}

jcond {
    numcheck: z < 10, notequal;
    devonly: sys.type == "device";
}

jasync {numcheck && devonly} function pong(q) {

    console.log("================ Pong!--- ", q);
}

var count = 0;
var indx = 0;

setInterval(()=> {
   y.broadcast(count);
   z.broadcast(indx);
   if (jsys.type === "fog") {
       console.log("xx Calling pong...count = ", count++, " indx = ", indx++);
       pong(count);
   }

}, 10000);


function notequal(q) {
    console.log("Not equal called..", q);
    return;
}

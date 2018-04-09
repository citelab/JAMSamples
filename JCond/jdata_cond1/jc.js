
jdata {
    int y as broadcaster;
    int z as broadcaster;
}


jcond {
    numcheck: z < 10, notequal;
    devonly: sys.type == "device";
}

jasync {numcheck && devonly} function pong(q) {

           console.log("Last value ", z.getLastValue());

    console.log("================ Pong!--- ", q);
}

var count = 0;
var indx = 0;

setInterval(()=> {

   if (jsys.type === "fog") {
       y.broadcast(count);
       z.broadcast(indx);

       console.log("xx Calling pong...count = ", count, " indx = ", indx);
       pong(count + "-ff");

       count++;
       indx++;
   }

}, 1000);


function notequal(q) {
    console.log("Not equal called..", q);
    return;
}

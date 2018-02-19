jcond {
    fogonly: sys.type == "fog";
    cloudonly: sys.type == "cloud";
}

jdata {
    char *y as broadcaster;
}

var count =10;


function sendbcast() {
   console.log("Sending broadcast....", count);
   var msg = "hello " + count
   y.broadcast(msg);
}


setInterval(function() {
	sendbcast();
}, 500);


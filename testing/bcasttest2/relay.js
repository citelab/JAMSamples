jdata {
    char *mytag as broadcaster;
}


if (jsys.type == "device") {
    mytag.addHook(function(o) {
	console.log("---> Msg ", o.message);
    });
} else if (jsys.type == "fog") {

    setInterval(function() {
	    console.log("broadcasting.. ", jsys.tags);
	    mytag.broadcast(jsys.tags);
    }, 100);

}


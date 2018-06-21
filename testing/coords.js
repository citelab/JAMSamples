jdata {
    char *y as broadcaster;    
    int x as logger;
}


jcond {
    fogonly: jsys.type == "fog";
}


jasync {fogonly} function callup() {
    console.log("Received an up call........");
}



setInterval(function() {

    if (jsys.type == 'device') {
	console.log("Coords ", jsys.long, ", ", jsys.lat);
	jsys.setLong(jsys.long - 1.0);
	jsys.setLat(jsys.lat - 1.0);	
    }


    if (jsys.type == "fog") {
	for (i = 0; i < x.size(); i++) {
            if (x[i] !== undefined) 
		console.log("I: ", i, " X = ", x[i].lastValue());
	}
    }

    var msg = "Message-from-Fog-A"
    var msgo = "Message-from-Other-fog"

    if (jsys.type == "fog") {
	if (jsys.tags === 'nodeA')
	    y.broadcast(msg);
	else
	    y.broadcast(msgo);
    }
    
}, 1000);


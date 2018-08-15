jdata {
    char *mytag as broadcaster;
}

var x = [1, 2, 3, 4, 50, 51, 52, 54, 55, 50, 10, 11];
var i = 0;

if (jsys.type == "device") {
    mytag.addHook(function(o) {
	console.log("Coords: ", jsys.long, jsys.lat, " msg ", o.message);
    });
}


if (jsys.type == "fog") {

    setInterval(function() {
	    console.log("broadcasting.. ", jsys.tags);
	    mytag.broadcast(jsys.tags);
    }, 10);

} else {

    setInterval(function() {
	if (i < 12) {
	    jsys.setLong(x[i++]);
	    jsys.setLat(0.0);
	} else
	    i = 0;
    }, 30);

}

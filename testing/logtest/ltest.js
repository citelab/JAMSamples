jdata {
    int y as logger;
}

var x = [1, 2, 3, 4, 50, 51, 52, 54, 55, 50, 10, 11];
var i = 0;


if (jsys.type == "fog") {

    setInterval(function() {
	for (i = 0; i < y.size(); i++) {
	    if (y[i] !== undefined) {
		console.log("I: ", i, "y: ", y[i].lastValue());
	    }
	}
    }, 100);

} else {

    setInterval(function() {
	if (i < 12) {
	    jsys.setLong(x[i++]);
	    jsys.setLat(0.0);
	} else
	    i = 0;
    }, 300);
}

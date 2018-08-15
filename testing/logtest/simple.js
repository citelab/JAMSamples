jdata {
    int y as logger;
}

setInterval(function() {
    for (i = 0; i < y.size(); i++) {
	if (y[i] !== undefined) {
	    console.log("I: ", i, "y: ", y[i].lastValue());
	}
    }
}, 100);

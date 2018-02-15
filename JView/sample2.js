jdata {
    float temp as logger;
    float pos as logger;
}

setInterval(function() {

	for (i = 0; i < pos.size(); i++) {
	    if (pos[i] !== undefined && pos[i].lastValue() != null)
	        console.log("Pos: ", pos[i].lastValue());
	}

	for (i = 0; i < temp.size(); i++) {
	    if (temp[i] !== undefined && temp[i].lastValue() != null)
		console.log("i ", i, " Temp: ", temp[i].lastValue());
	}
    }, 5000);

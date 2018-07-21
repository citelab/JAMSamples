jcond {
    fogonly: jsys.type == "fog";
}


var x = [1, 2, 3, 4, 50, 51, 52, 54, 55, 50, 10, 11];
var i = 0;



jsync {fogonly} function getNodeInfo() {
    if (jsys.tags === undefined)
	return "DON'T HAVE TAGS";
    else
	return jsys.tags;
}


if (jsys.type == "device") {

    setInterval(function() {
	if (i < 12) {
	    jsys.setLong(x[i++]);
	    jsys.setLat(0.0);
	} else
	    i = 0;
    }, 300);

}

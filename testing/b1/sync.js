var count = 1;

jsync function getID() {
    return count++;
}


var nodes;

setInterval(function() {
    nodes = tellid();
    if (nodes !== undefined) {
	console.log(nodes);
    }
}, 1000);

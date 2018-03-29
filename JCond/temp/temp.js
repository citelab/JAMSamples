var count = 10;

jasync function qq(q) {
    console.log("QQ called with ", q);
}


setInterval(function() {
	console.log("hello..\n");
	qq(count);
	count++;
    }, 1000);
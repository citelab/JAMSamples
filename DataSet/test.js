
function q(x) {

    console.log(x);
    (function p(l) {
	console.log("hello", l);
	l--;
	if (l > 0)
	    setTimeout(p, 100, l);
    })(x);
}

q(10);


function poke(msg) {
    console.log(msg);
}

(function qpoll(q) {
    q = q -1;
    console.log("I = ", q);
    callworker(10, poke);
    if (q > 0)
	setTimeout(qpoll, 500, q);
})(10);


    


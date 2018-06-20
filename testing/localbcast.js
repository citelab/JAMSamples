jdata {
    char *x as broadcaster;
    char *y as broadcaster;
}



var count = 1;
setInterval(function() {
    var msg = "msg-on-x=" + 2 * count;
    console.log(msg);
    x.broadcast(msg);
    var msg2 = "msg-on-y=" + (2 * count + 1);    
    y.broadcast(msg2);
    console.log(msg2);    
    count++;
}, 100);


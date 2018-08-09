var counter = 0;

jasync function pingserver(penum) {
    console.log("Ping received from ", penum);
}


jasync function regme(msg, cback) {
    
    counter = counter + 1;
    console.log("registration received from ", msg);
    cback('' + counter);
}


// Main program..


jdata {

    struct fogparams {
        int id;
        float xlong;
        float ylat;
    } fogparams as broadcaster;

    struct foginfo {
        int id;
        char *serial;
    } foginfo as logger;

    struct fogctrl {
        int id;
        char *serial;
    } fogctrl as broadcaster;

    struct devinfo {
        int id;
        char *serial;
    } devinfo as logger;

    struct devctrl {
        int id;
        char *serial;
    } devctrl as broadcaster;
}

jcond {
    fogonly: jsys.type == "fog";
}


var fs = require('fs');
var cp = require('child_process');

var coordSet = false;
var myId = -1;
var myFog = -1;
var fogIds = new Map();
var devIds = new Map();
var fogCnt = 1;
var dir;
var logCnt = 0;
var myfinfo = foginfo.getMyDataStream();
var mydinfo = devinfo.getMyDataStream();

var tdata;
var iniDist;


function measure(lon1, lat1, lon2, lat2) {

    // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; // meters
}

jsync {fogonly} function fogtest() {
    return myId;
}


function getFogId() {
    return fogCnt++
}

function getDevId() {
    var x = dir.shift();
    if (x !== undefined)
        return x.split("_")[1];

    return null;
}

function assembleInfo(c) {

    return c[0] + "\t" + c[1] + "\t" + c[2] + "\t" + c[3];
}

function setMyCoords(lng, lat) {
    coordSet = true;
    jsys.setLong(lng);
    jsys.setLat(lat);
}

function setNodeDelay(d) {

    cp.exec('tc qdisc add dev eth0 root netem delay ' + d + 'ms', function(err, stdo, stde) {

        if (err !== null) {
            cp.exec('tc qdisc replace dev eth0 root netem delay ' + d + 'ms', function(err, stdo, stde) {
            });
        }
    });
}

function computeDistance(xl, yl) {

    return measure(xl, yl, jsys.long, jsys.lat);
}


function getTimeDelay(nxt, fst, x) {

    var a = Date.parse(nxt);
    var b = Date.parse(fst);

    return (a - b)/x;
}


function processTrace(tdata) {

    (function loop(i) {
        var cmp = tdata[i].split(",");
        var line = assembleInfo(cmp);
        testFogPerf(line);
        setMyCoords(cmp[2], cmp[3]);
        i++;
        if (i < tdata.length) {
            var cmp2 = tdata[i].split(",");
            var delay = getTimeDelay(cmp2[1], cmp[1], 100);
            setTimeout(loop, delay, i);
        }
    })(0);
}



if (jsys.type == "cloud") {

    var dir = fs.readdirSync('Taxi');

    setInterval(function() {

        for (i = 0; i < foginfo.size(); i++) {
            if (foginfo[i] !== undefined) {
                var msg = foginfo[i].lastValue();
                console.log("message ", msg);

                if (msg != null && msg.id < 0) {
                    // Find an ID for the node
                    if (fogIds.get(msg.serial) === undefined) {
                        fogIds.set(msg.serial, getFogId());
                    }
                    var id = fogIds.get(msg.serial);
                    console.log("Broadcasting... id ", id);
                    fogctrl.broadcast({id: id, serial: msg.serial});
                }
            }
        }

        for (i = 0; i < devinfo.size(); i++) {
            if (devinfo[i] !== undefined) {
                var msg = devinfo[i].lastValue();
                if (msg != null && msg.id < 0) {
                    // Find an ID for the node
                    if (devIds.get(msg.serial) === undefined) {
                        devIds.set(msg.serial, getDevId());
                    }
                    var id = devIds.get(msg.serial);
                    console.log("Broadcasting... id ", id);
                    devctrl.broadcast({id: id, serial: msg.serial});
                }
            }
        }

    }, 2000);

} else if (jsys.type == "fog") {

    fogctrl.addHook(function(obj) {
        if (obj.message.serial == jsys.id) {
            myId = obj.message.id;
            console.log("My ID received ", obj.message.id);
        }
    });

    setInterval(function() {


        if (myId < 0) {
            console.log("Loggin......", myId);
            myfinfo.log({id: myId, serial: jsys.id});
            logCnt = 10;
        } else {
            logCnt--;
            if (logCnt > 0)
                myfinfo.log({id: myId, serial: jsys.id});
        }
        fogparams.broadcast({id: myId, xlong: jsys.long, ylat: jsys.lat});

    }, 1000);

} else if (jsys.type == "device") {

    devctrl.addHook(function(obj) {
        console.log(obj);
        if (obj.message.serial == jsys.id && myId < 0) {
            myId = obj.message.id;

            fs.readFile("Taxi/Taxi_" + myId, function(err, data) {
                var tdata = data.toString().split("\n");
                processTrace(tdata);
            });
        }
    });

    fogparams.addHook(function(obj) {
        console.log(obj.message);
        var fid = parseInt(obj.message.id);
        if (fid > 0 && myFog !== fid && coordSet == true) {
            myFog = fid;
            // Initialize the fog system..
            iniDist = computeDistance(obj.message.xlong, obj.message.ylat);
            setNodeDelay(5);
        } else if (fid > 0 && myFog === fid) {
            console.log(iniDist);
            var dist = computeDistance(obj.message.xlong, obj.message.ylat);
            console.log(jsys.long, jsys.lat);
            console.log(dist);
            var delay = 5 + Math.abs(iniDist - dist)/10;
            console.log("Delay ", delay);
            setNodeDelay(delay);
        }

    });

    setInterval(function() {

        if (myId < 0) {
            mydinfo.log({id: myId, serial: jsys.id});
            logCnt = 10;
        } else {
            logCnt--;
            if (logCnt > 0)
                mydinfo.log({id: myId, serial: jsys.id});
        }

    }, 1000);

}

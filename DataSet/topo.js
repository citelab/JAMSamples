// Main program..


jdata {

    struct fogparams {
        int id;
        float xlong;
        float ylat;
    } fogparams as broadcaster;

    struct fogctrl {
        int id;
        char *serial;
    } fogctrl as broadcaster;

    struct devctrl {
        int id;
        char *serial;
    } devctrl as broadcaster;
}

jcond {
    fogonly: jsys.type == "fog";
    cloudonly: jsys.type == "cloud";
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

    if (dir === undefined)
        dir = fs.readdirSync('Taxi');

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


jasync {cloudonly} function pushIdDev(ser) {

    if (devIds.get(ser) === undefined) {
        devIds.set(ser, getDevId());
    }

    var id = devIds.get(ser);
    console.log("Broadcasting... id ", id);
    devctrl.broadcast({id: id, serial: ser});
}

jasync {cloudonly} function pushIdFog(ser) {

    if (fogIds.get(ser) === undefined) {
        fogIds.set(ser, getFogId());
    }
    var id = fogIds.get(ser);
    console.log("Broadcasting... id ", id);
    fogctrl.broadcast({id: id, serial: ser});
}


if (jsys.type == "fog") {

    fogctrl.addHook(function(obj) {
        if (obj.message.serial == jsys.id) {
            myId = obj.message.id;
            console.log("My ID received ", obj.message.id);
        }
    });

    setInterval(function() {

        if (myId < 0)
            requestmyid(2, jsys.id);

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
        var fid = parseInt(obj.message.id);

        if (coordSet) {

            if (myFog !== fid)
                myFog = fid;

            var dist = computeDistance(obj.message.xlong, obj.message.ylat);
            setNodeDelay(dist/150);
            console.log("At location: ", jsys.long, jsys.lat);
        }
    });

    setInterval(function() {

        if (myId < 0)
            requestmyid(1, jsys.id);

    }, 1000);

}

// Main program..


jdata {

    struct fogparams {
        int id;
        float xlong;
        float ylat;
    }
    fogparams as broadcaster;

    struct fogctrl {
        int id;
        char * serial;
    }
    fogctrl as broadcaster;

    struct devctrl {
        int id;
        char * serial;
    }
    devctrl as broadcaster;
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
var dist;


function measure(lon1, lat1, lon2, lat2) {

    // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000; // meters
}

jsync {
    fogonly
}

function fogtest() {
    return myId;
}


function getFogId() {
    return fogCnt++
}

function getDevId() {

    if (dir === undefined)
        dir = fs.readdirSync('RTaxi');

    var x = dir.shift();
    if (x !== undefined)
        return x.split(".")[0];

    return null;
}

function assembleInfo(c) {

    return dist + "," + c[1] + "," + c[2] + "," + c[3] + "," + c[4];
}

function setMyCoords(lng, lat) {
    coordSet = true;
    jsys.setLong(lng);
    jsys.setLat(lat);
    console.log("Setting coords ", lng, lat);
}

function setNodeDelay(d) {

    cp.exec('tc qdisc add dev eth0 root netem delay ' + d + 'ms', function(err, stdo, stde) {

        if (err !== null) {
            cp.exec('tc qdisc replace dev eth0 root netem delay ' + d + 'ms', function(err, stdo, stde) {});
        }
    });
}

function computeDistance(xl, yl) {

    return measure(xl, yl, jsys.long, jsys.lat);
}


function getTimeDelay(nxt, fst, x) {

    var a = Date.parse(nxt);
    var b = Date.parse(fst);

    return (a - b) / x;
}


function processTrace(tdata) {

    console.log("-------------------- processTrace ------------");

    (function loop(i) {

        var cmp = tdata[i].split(",");
        console.log("i .... ", i, tdata.length);

        var line = assembleInfo(cmp);
        setMyCoords(cmp[3], cmp[4]);
        console.log("=============== i = ", i);

        (function inloop(j) {
            j++;

            if (j < 10) {
                testFogPerf(line);
                setTimeout(inloop, 8000, j);
            }
        })(0);

        i++;
        if (i < tdata.length - 1) {
            var cmp2 = tdata[i].split(",");
            var delay = getTimeDelay(cmp2[2], cmp[2], 100);
            setTimeout(loop, delay, i);
        }

    })(0);
}


jasync {
    cloudonly
}

function pushIdDev(ser) {

    if (devIds.get(ser) === undefined) {
        devIds.set(ser, getDevId());
    }

    var id = devIds.get(ser);
    console.log("Broadcasting... id ", id);
    devctrl.broadcast({
        id: id,
        serial: ser
    });
}

jasync {
    cloudonly
}

function pushIdFog(ser) {

    if (fogIds.get(ser) === undefined) {
        fogIds.set(ser, getFogId());
    }
    var id = fogIds.get(ser);
    console.log("Broadcasting... id ", id);
    fogctrl.broadcast({
        id: id,
        serial: ser
    });
}


if (jsys.type == "fog") {

    myId = parseInt(jsys.tags);

    setInterval(function() {

        fogparams.broadcast({
            id: myId,
            xlong: jsys.long,
            ylat: jsys.lat
        });

    }, 1000);

} else if (jsys.type == "device") {

    // devctrl.addHook(function(obj) {
    //     console.log(obj);
    //     if (obj.message.serial == jsys.id && myId < 0) {
    //         myId = obj.message.id;
    //
    //         fs.readFile("RTaxi/" + myId + ".csv", function(err, data) {
    //             var tdata = data.toString().split("\n");
    //             processTrace(tdata);
    //         });
    //     }
    // });

    myId = jsys.tags;

    fs.readFile("RTaxi/" + myId + ".csv", function(err, data) {
        var tdata = data.toString().split("\n");
        processTrace(tdata);
    });

    fogparams.addHook(function(obj) {

        var fid = parseInt(obj.message.id);
        if (fid > 0 && myFog !== fid && coordSet == true) {
            myFog = fid;
            // Initialize the fog system..
            dist = computeDistance(obj.message.xlong, obj.message.ylat) / 125;
            setNodeDelay(dist);
        } else if (fid > 0 && myFog === fid) {
            dist = computeDistance(obj.message.xlong, obj.message.ylat) / 125;
            setNodeDelay(dist);
        }

        console.log("Car ", myId, " My Fog ", myFog, " My Location ", jsys.long, jsys.lat, " Fog location ", obj.message.xlong, obj.message.ylat);
    });

    setInterval(function() {

        if (myId < 0)
            requestmyid(1, jsys.id);

    }, 100);

}

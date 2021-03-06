"use strict";

var rand = require('random-js')();
var num = require('./numeric');

jcond {
    fogonly: sys.type == "fog";
}

jdata {
   struct matrx {
       int x;
       int y;
       float val;
   } mrow as logger;

   int comp as logger;
}

var count = 1;
var invm = undefined;
var fullm = undefined;

jsync {fogonly} function getID() {
    return count++;
}

var waiting = true;
var REQC = 4, REQJ = 1;

var connect = true;

(function switcher() {

    if (connect) {
        var dtime = rand.integer(1, 2000);
        connect = false;
        setTimeout(switcher, dtime);
        console.log("Disconnecting....", dtime);
        invm = undefined;
    } else {
        var dtime = rand.integer(1, 1000);
        connect = true;
        setTimeout(switcher, dtime);
        console.log("Connecting....", dtime)
    }
})();


(function poll() {

    var cncnt = 0;
    for (i = 0; i < comp.size(); i++) {
        if (comp[i] != undefined && !comp[i].key.includes("_"))
            cncnt++;
    }
    if (jsys.type == 'device' && cncnt < REQC) {
        console.log("Waiting for for C nodes at device");
        setTimeout(poll, 200);
    } else if (jsys.type == 'fog' && cncnt < REQC * REQJ) {
        console.log("Waiting for for C nodes at fog");
        setTimeout(poll, 200);
    } else {
        // Do some processing...
        console.log("Do some processing...");
        waiting = false;

        for (i = 0; i < mrow.size(); i++) {
            if (mrow[i] != undefined && mrow[i].size() > 0)
                console.log("Size accumulated: ", mrow[i].size());
        }

        if (mrow[2] != undefined)
        {
            console.log("--------------------");
            var vals = [], rows = [], cols = [];
            var prevcol = -1;
            var j = 0;
            var values = mrow[2].get_all_values();
            values.forEach(function(obj, indx) {
                vals.push(obj.log.val);
                rows.push(obj.log.x -1);
                if (prevcol < obj.log.y) {
                    prevcol = obj.log.y;
                    cols.push(indx);
                }
                j++;
            });
            cols.push(j);
            fullm = num.ccsFull([cols, rows, vals]);
        }
    }
})();

function uploadDone() {
    if (waiting)
        setTimeout(uploadDone, 10);
}


jasync {fogonly} function checkUpload(x, cb) {

    uploadDone();
    cb("success");
}

jasync {fogonly} function processRequest(x, cb) {

    console.log("Process Request.....");
    if (connect) {
            console.log("Process Request.....222222222 ");
        if (invm === undefined) {
            console.log("Inverting matrix...");
            invm = num.inv(fullm);
        }
        computeMatrix();
        cb("success");
    } else {
        cb("-");
    }
}


function computeMatrix() {
    return;
}


function invertMatrix(x) {

    var cnt = parseInt(x);
    if (mrow[2] != undefined && mrow[2].size() == cnt)
    {
        console.log("--------------------");
        var vals = [], rows = [], cols = [];
        var prevcol = -1;
        var j = 0;
        var values = mrow[2].get_all_values();
        values.forEach(function(obj, indx) {
            vals.push(obj.log.val);
            rows.push(obj.log.x -1);
            if (prevcol < obj.log.y) {
                prevcol = obj.log.y;
                cols.push(indx);
            }
            j++;
        });
        cols.push(j);

        var fullm = num.ccsFull([cols, rows, vals]);
        return num.inv(fullm);
    }
    return undefined;
}

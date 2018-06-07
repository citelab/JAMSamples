"use strict";

var num = require('./numeric')

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

jsync {fogonly} function getID() {
    return count++;
}

var waiting = true;
var REQC = 4, REQJ = 1;

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
    }
})();


jasync {fogonly} function solveProb(x, cb) {

    if (waiting)
        cb("-");
    else
        cb("reveived the data from loggers");

}

jasync {fogonly} function processMatrix(x, cb) {

    var cnt = parseInt(x);
    if (mrow[2] != undefined && mrow[2].size() == cnt)
    {
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
        var invm = num.inv(fullm);
        cb("success");
    } else
        cb("error");
}

//
//     if (mrow.size() < 2)
//     {
//         console.log("Delay....");
//
//     }
//     else if (mrow[1] != undefined && mrow[1].size() < count)
//         setTimeout(poll, 1000);
//
//     if (mrow.size() == 2 && mrow[1].size() == count)
//         done();
// })();
//
// function done() {
//

// }

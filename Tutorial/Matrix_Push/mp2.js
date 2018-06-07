"use strict";

jdata{
   struct matrx {
       int x;
       int y;
       float val;
   } mrow as logger;

   mf as flow with flowFunc of mrow;
}


function flowFunc(inputFlow) {
   return inputFlow.discretize(3, 1, true, stream => !stream.key.includes("_"));//filter out J streams
}

//just print some values off the discreteFlow
var terminalFunc = function(f) {
    var flow = f.selectFlatten().select("data");

    var g = flow.collect();
    console.log("Data: " + g);
    g.forEach(function(obj, idx) {
        console.log(obj, idx);
    });
};

mf.setTerminalFunction(terminalFunc);

//poll until we have up to 3 C-Nodes running
(function poll(){
    if( mrow.size() < 4 ){
        console.log("waiting till we have 3 C-nodes running");
        setTimeout(poll, 2000);
    }
    else
        stats.startPush();
})();

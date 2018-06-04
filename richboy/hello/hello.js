/**
 * Created by Richboy on 27/06/17.
 */

"use strict";

jdata{
    int x as logger;
    //f as flow with toDiscretizer of x;
}

function toDiscretizer(inputFlow){
    return inputFlow.discretize(3, 1);
}

//just print some values off the discreteFlow
var terminalFunc = discreteFlow => {
    var flow = discreteFlow.selectFlatten().select(entry => entry.data - 0);
    var avg = flow.average();
    var sum = flow.sum();

    console.log("Sum: " + sum + ", Average: " + avg);
};



//poll until we have up to 3 C-Nodes running
(function poll(){
    if( x.size() < 4 ){
        console.log("waiting till we have 3 C-nodes running");
        setTimeout(poll, 2000);
    }
    else {
        var myFlow = null;
        for(var i = 0; i < x.size(); i++){
            if( x[i].key === x.getMyDataStream().key )
                continue;
            if( myFlow == null )
                myFlow = Flow.from(x[i]);
            else
                myFlow.merge(x[i]);
        }
        var f = toDiscretizer(myFlow);
        f.setTerminalFunction(terminalFunc);
        f.startPush();
    }
})();

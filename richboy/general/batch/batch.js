jdata{
    struct mtrx{
        int x;
        int y;
        int val;
    }mtrx as logger;

}

var countdown = 7;

//for single streams:
function outputEachStream(){
    var streams = Flow.from(mtrx.toIterator()).where(stream => !stream.key.includes("_")).collect();    //exclude JStream

    streams.forEach(function(stream){
        console.log("Outputting for stream:", stream.key);
        var stats = Flow.from(stream);  //could add other flow functions to chain operations
        stats.forEach(input => console.log(input.log));
    });
}

function mergeWithDiscretize(){
    var streams = Flow.from(mtrx.toIterator()).where(stream => !stream.key.includes("_")).collect();    //exclude JStream

    var stats = Flow.of(streams).discretize(streams.length, 1, true);

    stats.forEach(input => console.log(input.selectFlatten().select(elem => elem.log).collect()));
}


//poll until we have up to 3 C-Nodes running
(function poll(){
    if( mtrx.size() < 4 ){
        console.log("waiting till we have 3 C-nodes running");
        setTimeout(poll, 2000);
    }
    else {  //wait till we have all the logged data
        console.log("Starting in ", countdown, "sec(s)");
        countdown--;

        if( countdown == 0 ){   //operate on the batch data
            outputEachStream(); //print for single streams

            console.log("\nOutputting for the merge stream:\n");
            mergeWithDiscretize();  //print for the merge stream

            return;
        }

        setTimeout(poll, 1000);
    }
})();
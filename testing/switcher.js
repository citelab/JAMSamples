var rand = require('random-js')();

var connect = true;

(function switcher() {

    if (connect) {
        var dtime = rand.integer(1, 2000);
        connect = false;
        setTimeout(switcher, dtime);
        console.log("Disconnecting....", dtime)
    } else {
        var dtime = rand.integer(1, 1000);
        connect = true;
        setTimeout(switcher, dtime);
        console.log("Connecting....", dtime)
    }
})();

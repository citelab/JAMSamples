var rand = require('random-js');

var connect = true;

(function switcher() {

    if (connect) {
        var dtime = rand.integer(1, 5000);
        setTimeout(switcher, dtime);
    } else {



    }
})();


jasync function processMatrix(val, cb) {
    console.log(typeof(val), val);
    cb("return message");
}

var poissonProcess = require('poisson-process');
var Random = require('random-js');

var maxTaxies = 100;
var maxY = 1000.0,
    maxX = 1000.0;

var taxiCnt = 0;

var engine = Random.engines.mt19937().autoSeed();

function generateX() {
    var f = Random.real(0, maxX);
    return f(engine);
}

function generateY() {
    var f = Random.real(0, maxY);
    return f(engine);
}

function step() {
    var f = Random.real(0, 3.0);
    return f(engine);
}

function bool() {
    var f = Random.bool(.5);
    return f(engine);
}


class Taxi {

    constructor(id) {
        this.id = id;
        this.x = generateX();
        this.y = generateY();

        setInterval(function (t) {
            console.log(t.id, t.x, t.y);
            if (bool() === true)
                t.x += step();
            else
                t.x -= step();

            if (bool() === true)
                t.y += step();
            else
                t.y -= step();

        }, 100, this);

    }
}


(function startTaxi(taxiCnt) {
    var p = poissonProcess.sample(600);

    var t = new Taxi(taxiCnt);
    taxiCnt++;
    if (taxiCnt < maxTaxies)
        setTimeout(startTaxi, p, taxiCnt);
})(1);


setTimeout(function() {
    process.exit();
}, 600 * 10000);

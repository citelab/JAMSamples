jasync function foobar(q) {
    console.log('foobar called.. ', q);
}

var count = 1;

if (jsys.type == 'cloud') {
    setInterval(function() {
        console.log('calling foobar');
        foobar(count++);
    }, 2000);
}

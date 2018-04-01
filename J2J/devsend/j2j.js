jasync function foobar() {
    console.log('foobar called');
}

setInterval(function() {
    console.log('calling foobar');
    foobar();
}, 2000);


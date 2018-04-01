jasync function foobar() {
    console.log('foobar called');
}

if (jsys.type == 'fog') {
    setInterval(function() {
        console.log('calling foobar');
        foobar();
    }, 2000);
}

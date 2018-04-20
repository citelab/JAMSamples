jcond {
  deviceonly: sys.type == "device";
}

jasync {deviceonly} function f(id) {
    console.log("----> ", id);
}

if (jsys.type == 'fog') {
  setInterval(function() {
    console.log(jsys.id);
    f(jsys.id);
  }, 1000);
}

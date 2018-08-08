jcond {
    fogonly: jsys.type == "fog";
}

var count = 1;

jsync {fogonly} function getId() {
    return count++;
}



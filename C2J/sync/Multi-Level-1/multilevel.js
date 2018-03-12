jcond {
    fogonly: sys.type == "fog";
}


var count=10;


jsync function getIdDev() {
    count = count + 1;
    return count;
}


jsync {fogonly} function getId() {
    count = count + 1;
    return count;
}


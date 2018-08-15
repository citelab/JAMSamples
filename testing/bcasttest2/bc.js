jdata {
    int y22 as broadcaster;
} 


var count = 10;
setInterval(function() {
    
    y22.broadcast(count++);
    
}, 1000);
    

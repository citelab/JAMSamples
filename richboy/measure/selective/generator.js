var fs = require('fs');

ws = fs.createWriteStream("dataset.txt", {flags:'a'});
for ( var i = 0; i < 20000; i++ ){
    var rate = Math.floor(Math.random() * (110 - 60) + 60);
    ws.write(rate + "\n");
}
ws.end();

console.log("Done!!!");
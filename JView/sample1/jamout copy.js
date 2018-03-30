
var io = require('socket.io-client');
var socket = io('http://localhost:3000');
socket.on('emitValue', (data) => { if(data.id === "slid") console.log(data.value); });
socket.on('emitValue', (data) => { if(data.id === "bTn") if(data.value === false) console.log(data.value); });

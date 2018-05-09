jdata{
    char* waste as logger;
}

var handle = new InFlow(JAMManager);
handle.openFlow("fixed");

handle.setTerminalFunction(function(input){
    console.log(input);
});
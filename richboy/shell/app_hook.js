
'use strict';

var Hook = require('./hook.js');
const cmd = require('node-cmd');
const fs = require('fs');
const npath = require('path');
const {Flow, OutFlow, InFlow, Streamer} = require('richflow').Flow;
//var stream = require('stream');

const startingRedisPort = 1379;
const startingMQTTPort = 2883;
var redises = [];
var redisPorts = [];
var cNodes = [];
var jNodes = [];
var path;

var apps = {};  //name: {path, tokens, code, cNodes, jNodes, redises, redisPorts}

class AppHook extends Hook{
    constructor(opts){
        super(opts);
        this.resolver = () => false;
        this.isBusy = false;

        this.prompt = "App> ";
    }

    getInput(history){
        var self = this;
        return new Promise((resolve, reject) => {
            self.terminal.inputField(
            {
                history: history,
                tokenHook: self.tokenizer,
                autoCompleteHint: true,
                autoComplete: self.getAutoCompleteData()
            },
            (err, input) => {
            if( self.isBusy ){
            self.resolver = resolve;
        }
    else {
            if (err)
                reject(err);
            else {
                resolve(input);
            }
        }
    }
    );
    });
    }

    execute(code){
        code = code.trim();
        var parts = code.split(/\s+/);
        var tokens;
        var self = this;

        if( parts.length == 0 || parts[0].trim() === "" ){    //if no command was entered
            return;
        }

        try {
            switch (parts[0]) {
                case "run":
                    // command: run <name>
                    // description: List the data streams in the data source specified in <name>
                    // options:
                    // -f, --from <index> The offset/index to start from
                    // -t, --to <index> The index to end
                    // -h, --help See usage help
                    //tokens = this.parser(code, {alias: {'from': ['f'], 'to': ['t'], 'help': ['h']}, number: ['from', 'to']});

                    var build = {
                        cmd: "run <path> <name>",
                        desc: "Run a JAMScript program located at <path> with the App name as <name>",
                        opts: [
                            {cmd: "-a, --args <args>", desc: "Arguments to the C program"},
                            {cmd: "-t, --tags <tags>", desc: "The tags argument to pass to the JNodes"},
                            {cmd: "-d, --devices <number>", desc: "Launch <number> number of C-Nodes"},
                            {cmd: "-f, --focus <level>", desc: "Focus on either the device, fog or cloud or all or none"},
                            {cmd: "-F, --force", desc: "Force start App even if one with same name is already running"},
                            {cmd: "-l, --launch", desc: "Launch terminals for each running component"},
                            {cmd: "-j, --js <filename>", desc: "The name of the js file to be run by the JAMScript runtime. Useful if there are several js files in the App"},
                            {cmd: "--no-flush", desc: "Do not flush the redis database"},
                            {cmd: "--no-compile", desc: "Do not compile the app before running"},
                            {cmd: "--no-fog", desc: "Do not run the fog component"},
                            {cmd: "--no-cloud", desc: "Do not run the cloud component"},
                            {cmd: "-h, --help", desc: "See usage help"}
                        ],
                        code: code,
                        number: ["devices"]
                    };

                    tokens = this.parse(build);

                    if (tokens.help) { //if help was called
                        this.printHelp(build);
                        return;
                    }

                    let path = tokens.path;
                    let appName = tokens.name;

                    if (!path || !appName) {
                        console.log("Application Path and Application Name are required!");
                        this.printHelp(build);
                        return;
                    }

                    //check if path exists
                    if (!fs.existsSync(path)) {
                        this.terminal.red(`The path "${npath.resolve(path)}" does not exist!`);
                        console.log();
                        return;
                    }

                    //this.isBusy = true;
                    this.writeToHistory(code);
                    let compile = tokens.compile !== false;

                    //check if an app with the specified name is already running
                    if( apps[appName] && !tokens.force ){
                        this.terminal.magenta(`An app with the name "${appName}" is already running!`);
                        console.log();
                        return;
                    }
                    if( apps[appName] ){
                        this.terminal.yellow(`Warning: Forcing already running App "${appName}"...`);
                        console.log();
                    }


                    //find the javascript file to run
                    let jsFile = "";
                    let cFile = "";
                    if( tokens.js )
                        jsFile = tokens.js;
                    else{   //read the directory and find the first js file
                        let fileList = fs.readdirSync(npath.resolve(tokens.path));
                        for( let aFile of fileList ){
                            let stats = fs.lstatSync(npath.join(npath.resolve(tokens.path), aFile));
                            if( !stats.isDirectory() && aFile.toLowerCase().endsWith(".js") ){
                                jsFile = aFile;
                                break;
                            }
                        }
                    }

                    if( jsFile === "" ){
                        self.terminal.red("Unable to find a Javascript file in the specified path");
                        console.log();
                        return;
                    }

                    let jsFileName = jsFile.substring(0, jsFile.lastIndexOf("."));

                    let fileList = fs.readdirSync(npath.resolve(tokens.path));
                    for( let aFile of fileList ){
                        let stats = fs.lstatSync(npath.join(npath.resolve(tokens.path), aFile));
                        if( !stats.isDirectory() && aFile.toLowerCase().endsWith(".c") ){
                            cFile = aFile;
                            break;
                        }
                    }

                    if( cFile === "" ){
                        self.terminal.red("Unable to find a C program file in the specified path");
                        console.log();
                        return;
                    }

                    tokens.js = jsFile;
                    tokens.jsFile = jsFile;
                    tokens.jsFileName = jsFileName;


                    var app = {name: appName, path: path, rpath: npath.resolve(path), code: code, tokens: tokens, cNodes: [],
                        jNodes: [], redises: [], redisPorts: []};
                    apps[appName] = app;

                    //since all C nodes are currently on this port
                    //this._startRedisServer(6379, tokens.flush !== false, app);


                    //compile the app if specified
                    if (compile) {
                        console.log("Compiling App...");
                        cmd.run(`
                        cd ${npath.resolve(tokens.path)}
                        rm ${tokens.jsFileName}.jxe
                        rm -rf ${npath.resolve(tokens.path)}/${tokens.jsFileName}_${tokens.name}
                        `);

                        cmd.get(
                            `
                        cd ${npath.resolve(tokens.path)}
                        jamc ${cFile} ${jsFile}
                        `,
                            function (err, data, stderr) {
                                //console.log(data);
                                if ( err || data.indexOf("ERROR:") >= 0 || data.toLowerCase().indexOf("compilation failed") >= 0 || data.indexOf("errors generated") >= 0  || data.indexOf("error generated") >= 0 ) {
                                    self.terminal.red(stderr || data);
                                    console.log();
                                    self.resolver("\n");
                                    self.isBusy = false;
                                    return;
                                }
                                if( data.indexOf("warnings generated") >= 0 || data.indexOf("warning generated") >= 0 ){
                                    self.terminal.yellow(data);
                                    console.log();
                                }
                                else
                                    console.log(`Compile successful. Running the "${appName}" App...`);

                                setTimeout(() => self._launchApp(app), 1000);
                            }
                        )
                    }
                    else
                        this._launchApp(app);


                    break;
                case "apps":    //see the name of all running apps
                    let keys = Object.keys(apps);
                    if( keys.length === 0 ){
                        console.log("No Application is currently running");
                        return;
                    }

                    console.log("The following application(s) are currently running:");
                    for( let key of keys )
                        console.log(key);

                    break;
                case "kill":
                    var build = {
                        cmd: "kill <app>",
                        desc: "Stops the running application with the name <app> and all used redis servers. If all is passed, all running apps will be stopped",
                        opts: [
                            {cmd: "-h, --help", desc: "See usage help"}
                        ],
                        code: code
                    };
                    tokens = this.parse(build);

                    if (tokens.help) { //if help was called
                        this.printHelp(build);
                        return;
                    }

                    if( !tokens.app ){
                        console.log("Please specify the App to stop");
                        this.printHelp(build);
                        return;
                    }

                    this.writeToHistory(code);

                    if( Object.keys(apps).length === 0 ){
                        console.log("No Application is currently running");
                        return;
                    }

                    if( tokens.app === "all" ) {
                        console.log("Killing all running Applications...");
                        this.disconnect();
                    }
                    else{
                        if( apps[tokens.app] ){
                            console.log("Killing " + tokens.app + " ...");
                            this._appHousekeeping(apps[tokens.app], true);
                            this._appDisconnect(apps[tokens.app]);
                        }
                        else{
                            self.terminal.yellow("There is no currently running application with the name: " + tokens.app);
                            console.log();
                        }
                    }

                    break;
                case "stop":
                    var build = {
                        cmd: "stop <app>",
                        desc: "Stops the running application with the name <app> leaving all redis servers running. If all is passed, all running apps will be stopped",
                        opts: [
                            {cmd: "-h, --help", desc: "See usage help"}
                        ],
                        code: code
                    };
                    tokens = this.parse(build);

                    if (tokens.help) { //if help was called
                        this.printHelp(build);
                        return;
                    }

                    if( !tokens.app ){
                        console.log("Please specify the App to stop");
                        this.printHelp(build);
                        return;
                    }

                    this.writeToHistory(code);

                    if( Object.keys(apps).length === 0 ){
                        console.log("No Application is currently running");
                        return;
                    }

                    if( tokens.app === "all" ) {
                        console.log("Stopping all running Applications...");
                        this.housekeeping();
                    }
                    else{
                        if( apps[tokens.app] ){
                            console.log("Stopping " + tokens.app + " ...");
                            this._appHousekeeping(apps[tokens.app]);
                        }
                        else{
                            self.terminal.yellow("There is no currently running application with the name: " + tokens.app);
                            console.log();
                        }
                    }

                    break;
                case "redis":
                    switch (parts[1]){
                        case "stop":
                            var build = {
                                cmd: "redis stop <ports>",
                                desc: "Stop all redis servers running at the ports <ports>",
                                opts: [
                                    {cmd: "-h, --help", desc: "See usage help"}
                                ],
                                code: code
                            };

                            tokens = this.parse(build);

                            if (tokens.help) { //if help was called
                                this.printHelp(build);
                                return;
                            }

                            if( !tokens.ports ){
                                console.log("Please specify at least one port");
                                this.printHelp(build);
                                return;
                            }
                            this.writeToHistory(code);

                            var ports = tokens.ports;

                            if( ports == "all" ){
                                cmd.run(`redis-cli -h 127.0.0.1 -p 6379 SHUTDOWN NOSAVE`);
                                cmd.run(`redis-cli -h 127.0.0.1 -p 1379 SHUTDOWN NOSAVE`);
                                cmd.run(`redis-cli -h 127.0.0.1 -p 1389 SHUTDOWN NOSAVE`);
                                cmd.run(`redis-cli -h 127.0.0.1 -p 1399 SHUTDOWN NOSAVE`);
                            }
                            else {
                                if (typeof ports === "string") {
                                    ports = ports.split(",");
                                    if (ports[ports.length - 1].trim() === "")
                                        ports.splice(ports.length - 1, 1);
                                }

                                for (let port of ports)
                                    cmd.run(`redis-cli -h 127.0.0.1 -p ${port} SHUTDOWN NOSAVE`);
                            }

                            break;
                        case "flush":
                            var build = {
                                cmd: "redis flush <ports>",
                                desc: "Flush the data in the redis servers running at the ports <ports>",
                                opts: [
                                    {cmd: "-h, --help", desc: "See usage help"}
                                ],
                                code: code
                            };

                            tokens = this.parse(build);

                            if (tokens.help) { //if help was called
                                this.printHelp(build);
                                return;
                            }

                            if( !tokens.ports ){
                                console.log("Please specify at least one port");
                                this.printHelp(build);
                                return;
                            }
                            this.writeToHistory(code);

                            var ports = tokens.ports;

                            if( ports == "all" ){
                                cmd.run(`redis-cli -h 127.0.0.1 -p 6379 FLUSHALL`);
                                cmd.run(`redis-cli -h 127.0.0.1 -p 1379 FLUSHALL`);
                                cmd.run(`redis-cli -h 127.0.0.1 -p 1389 FLUSHALL`);
                                cmd.run(`redis-cli -h 127.0.0.1 -p 1399 FLUSHALL`);
                            }
                            else {
                                if (typeof ports === "string") {
                                    ports = ports.split(",");
                                    if (ports[ports.length - 1].trim() === "")
                                        ports.splice(ports.length - 1, 1);
                                }

                                for (let port of ports)
                                    cmd.run(`redis-cli -h 127.0.0.1 -p ${port} FLUSHALL`);
                            }

                            break;
                        case "clear":
                            this.writeToHistory(code);
                            cmd.run(`redis-cli -h 127.0.0.1 -p 6379 FLUSHALL`);
                            cmd.run(`redis-cli -h 127.0.0.1 -p 1379 FLUSHALL`);
                            cmd.run(`redis-cli -h 127.0.0.1 -p 1389 FLUSHALL`);
                            cmd.run(`redis-cli -h 127.0.0.1 -p 1399 FLUSHALL`);
                            break;
                        case "keys":
                            var build = {
                                cmd: "redis keys <port>",
                                desc: "Print all data keys running at the redis server on port <port>",
                                opts: [
                                    {cmd: "-h, --help", desc: "See usage help"}
                                ],
                                code: code,
                                number: ['port']
                            };

                            tokens = this.parse(build);

                            if (tokens.help) { //if help was called
                                this.printHelp(build);
                                return;
                            }

                            if( !tokens.port || tokens.port < 1024 ){
                                console.log("Please specify a valid Redis Server port");
                                this.printHelp(build);
                                return;
                            }
                            this.writeToHistory(code);

                            var port = tokens.port;

                            cmd.get(`redis-cli -h 127.0.0.1 -p ${port} KEYS \\*`, function(err, data, stderr){
                                if( err ){
                                    self.terminal.red(stderr);
                                    console.log();
                                }
                                else
                                    console.log(data);
                            });
                            break;
                        case "data":
                            var build = {
                                cmd: "redis data <port> <index>",
                                desc: "Print all data available at the key index <index> of all keys running at the redis server on port <port>",
                                opts: [
                                    {cmd: "-h, --help", desc: "See usage help"}
                                ],
                                code: code,
                                number: ['port', 'index']
                            };

                            tokens = this.parse(build);

                            if (tokens.help) { //if help was called
                                this.printHelp(build);
                                return;
                            }

                            if( !tokens.port || tokens.port < 1024 || tokens.index == null ){
                                console.log("A valid Redis server port and key index are required!");
                                this.printHelp(build);
                                return;
                            }

                            this.writeToHistory(code);

                            var port = tokens.port;
                            var index = tokens.index;

                            cmd.get(`redis-cli -h 127.0.0.1 -p ${port} KEYS \\*`, function(err, data, stderr){
                                if( err ){
                                    self.terminal.red(stderr);
                                    console.log();
                                }
                                else{
                                    var lines = data.split("\n");
                                    if( index < lines.length && lines[0].trim() != "" ){
                                        cmd.get(`redis-cli -h 127.0.0.1 -p ${port} ZRANGE ${lines[index]} 0 -1`, function(er, da, stdr){
                                            if( er ){
                                                self.terminal.red(stdr);
                                                console.log();
                                            }
                                            else
                                                console.log(da);
                                        });
                                    }
                                    else{
                                        self.terminal.yellow("No key was found at the specified index");
                                        console.log();
                                    }
                                }
                            });

                            break;
                        default:
                            console.log(`redis ${parts[1]} command not found`);
                    }
                    break;
                default:
                    console.log("Command not found");
            }
        }
        catch(e){
            this.terminal.red(e);
            console.log();
            self.resolver("\n");
            self.isBusy = false;
        }
    }

    _launchApp(app){
        let tokens = app.tokens;
        let args = tokens.args ? " " + tokens.args.split(",").join(" ").trim() : "";
        let tags = " ";
        if( tokens.tags && Object.prototype.toString.call(tokens.tags) === '[object String]' )
            tags = tokens.tags.split(",").join("_").trim();
        else if( tokens.tags && typeof tokens.tags.length === 'number' && tokens.tags.length >= 0 )  //it must be an array
            tags = tokens.tags.join("_").trim();

        let devices = tokens.devices || 1;
        let launch = tokens.launch;
        let focus = tokens.focus || "none";
        let flush = tokens.flush !== false;
        let fog = tokens.fog !== false;
        let cloud = tokens.cloud !== false;
        let redis = 6379;
        let mqtt = startingMQTTPort;
        let self = this;


        //start the device JNode. This will always have the default 6379 port because currently the CNode has been restricted to that
        this._startJNode(redis, mqtt, flush, tokens, "device", tags, app);

        //start the C devices
        setTimeout(function(){
            for(let i = 0; i < devices; i++){
                (function(id){
                    cmd.run(`
                        cd ${npath.resolve(tokens.path)}
                        cd ${npath.resolve(tokens.path)}/${tokens.jsFileName}_${tokens.name}/
                        chmod +x a.out
                    `);

                    let cNode = cmd.get(`
                    cd ${npath.resolve(tokens.path)}
                    cd ${npath.resolve(tokens.path)}/${tokens.jsFileName}_${tokens.name}/
                    chmod +x a.out
                    ${npath.resolve(tokens.path)}/${tokens.jsFileName}_${tokens.name}/a.out -n ${id} -a ${tokens.name} node${id}${args}
                    `, function(err, stdout, stderr){
                        if( err && stderr ) {
                            console.log(`CNode ${id} reported error:`);
                            self.terminal.red(stderr);
                            console.log();
                            self.resolver("\n");
                            self.isBusy = false;
                        }
                    });
                    if( focus === "device" || focus === "devices" || focus === "all" ){
                        var line = "",  line2 = "";

                        // var writable = new stream.Writable({
                        //     write: function(chunk, encoding, next) {
                        //         line += chunk.toString();
                        //         if (line[line.length - 1] == "\n") {
                        //             console.log(line.substring(0, line.length - 1));
                        //             line = "";
                        //         }
                        //         next();
                        //     },
                        //     end: function(chunk){
                        //         line += chunk.toString();
                        //         console.log(line);
                        //     }
                        // });

                        // cNode.stdout.pipe(process.stdout);
                        // cNode.stdout.on(
                        //     'data',
                        //     function(data) {
                        //         line += data.toString();
                        //         if (line[line.length - 1] == "\n") {
                        //             console.log(line.substring(0, line.length - 1));
                        //             line = "";
                        //         }
                        //     }
                        // );
                    }
                    app.cNodes.push({
                        node: cNode,
                        id: id,
                        fullID: "node" + id
                    });
                })(i + 1);
            }

            //self.copyFiles(tokens);
        }, 1000);



        redis = startingRedisPort;
        mqtt += 10;

        //start the fog if supported
        if( fog ){
            this._startJNode(redis, mqtt, flush, tokens, "fog", tags, app);
            redis += 10;
            mqtt += 10;
        }

        //start the cloud if supported
        if( cloud ){
            this._startJNode(redis, mqtt, flush, tokens, "cloud", tags, app);
        }

    }

    copyFiles(tokens){
        //check if there are other files in the folder that needs to be copied
        let fileList = fs.readdirSync(npath.resolve(tokens.path));
        for( let aFile of fileList ){
            let stats = fs.lstatSync(npath.join(npath.resolve(tokens.path), aFile));
            if( !stats.isDirectory() && !aFile.endsWith(".jxe") ){
                //TODO we could exclude the C and JS files but there may not be any need to
                fs.createReadStream(npath.join(npath.resolve(tokens.path), aFile)).pipe(fs.createWriteStream(npath.join(npath.resolve(tokens.path), tokens.jsFileName + '_' + tokens.name, aFile)));
            }
        }
    }

    _startJNode(redis, mqtt, flush, tokens, level, tags, app){
        let focus = tokens.focus || "none";
        var self = this;

        this._startRedisServer(redis, flush, app);
        (function(r, m){
            setTimeout(function(){
                var levelTag = "";
                var port = "";

                if( level != "device" ) {
                    levelTag = " --" + level;
                    port = " --port=" + m;
                }

                var node = cmd.get(`
                    cd ${npath.resolve(tokens.path)}
                    jrun ${npath.resolve(tokens.path)}/${tokens.jsFileName}.jxe --app=${tokens.name} --data=127.0.0.1:${r}${port}${levelTag} --tags="${tags}"
                    `, function(err, stdout, stderr){
                    if( err ) {
                        console.log(`The ${level} JNode reported error:`);
                        self.terminal.red(stderr);
                        console.log();
                        self.resolver("\n");
                        self.isBusy = false;
                    }
                });

                if( focus === level || focus === level + 's' || focus === "all" ){
                    var line = "";
                    node.stdout.on(
                        'data',
                        function(data) {
                            line += data.toString();
                            if (line[line.length - 1] == '\n') {
                                console.log(line.substring(0, line.length - 1));
                                line = "";
                            }
                        }
                    );
                }

                app.jNodes.push({
                    node: node,
                    level: level,
                    redis: r,
                    mqtt: m,
                    pid: node.pid
                });
            }, level == "device" ? 100 : 200);
        })(redis, mqtt);
    }

    disconnect(){
        //terminate all running apps
        this.housekeeping(true);

        let keys = Object.keys(apps);
        for( let key of keys ) {
            this._appDisconnect(apps[key]);
            delete apps[key];
        }
    }

    _appDisconnect(app){
        //close all started redis servers
        if( app.redises.length > 0 )
            console.log(`\nShutting down started redis servers for the App "${app.name}"...`);
        for( let port of app.redisPorts )
            cmd.run(`redis-cli -h 127.0.0.1 -p ${port} SHUTDOWN NOSAVE`);
        for( let redis of app.redises )
            this._killNode(redis);
    }

    housekeeping(wait){
        let keys = Object.keys(apps);
        for( let key of keys ) {
            this._appHousekeeping(apps[key], wait);
        }
    }

    _appHousekeeping(app, wait){
        let path = app.path;
        let jNodes = app.jNodes;
        let cNodes = app.cNodes;

        for( let jNode of jNodes )
            this._killNode(jNode.node);
        for( let cNode of cNodes )
            this._killNode(cNode.node);

        cmd.run(`
            ps aux | grep -ie ${npath.resolve(path)} | awk '{print $2}' | xargs kill -2
            ps aux | grep -ie ${npath.resolve(path)} | awk '{print $2}' | xargs kill -2
            ps aux | grep -ie ${npath.resolve(path)} | awk '{print $2}' | xargs kill -9
            `);

        app.jNodes = [];
        app.cNodes = [];

        if( !wait )
            delete apps[app.name];
    }

    _killNode(node){
        node.kill('SIGINT');
        node.kill('SIGTERM');
        node.kill('SIGHUP');
        cmd.run(`
        kill -2 ${node.pid}
        kill -2 ${node.pid}
        kill -9 ${node.pid}
        `);
    }

    _startRedisServer(port, flush, app){
        //check if this redis server is already running
        cmd.get(
            `redis-cli -h 127.0.0.1 -p ${port} PING`,
            function(err, data, stderr){
                if( err ){
                    console.log();
                    //no redis was found so let us start a redis server at this port
                    app.redisPorts.push(port);
                    let proc = cmd.run(`redis-server --port ${port}`);
                    app.redises.push(proc);
                    console.log(`Started Redis Server on port ${port}`);
                    return;
                }
                if( flush )
                    cmd.run(`redis-cli -h 127.0.0.1 -p ${port} FLUSHALL`);
                console.log(`Using Redis Server on port ${port}`);
            }
        );
    }
}

module.exports = AppHook;
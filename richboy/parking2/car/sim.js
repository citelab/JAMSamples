class Event{
    constructor(id, timeDelta, longitude, latitude, speed, northAngle, status, index){
        this.id = id;
        this.time = timeDelta;
        this.longitude = longitude;
        this.latitude = latitude;
        this.speed = speed;
        this.northAngle = northAngle;
        this.status = status;
        this.index = index;
    }
}


class Simulation{
    //fileFlow is the Flow object to read the file one line at a time
    //speed is the speed of the simulation. It will factor in the time adjustment to the data it is 1.0 by default
    //startTime is the time to start the simulation. It will create the offset from the original time
    //probability is the factor that this car will ask for a parking spot when it drops a passenger (0 - 100)
    //TODO we need to randomly factor in times when the taxi should opt for parking
    //0 = vacant, 1 = with passenger, 2 = is parked (or requesting parking)
    constructor(fileFlow, speed, probability, CarActions){
        this.events = [];
        this.speed = speed;
        this.probability = probability;
        this.time = 0;
        this.currentEvent = null;
        this.CarActions = CarActions;
        this.currentParking = null;

        var t = 0;
        var lastTime = null;

        fileFlow.forEach(function(line, index){
            var parts = line.split(",");
            if( lastTime != null )
                t = Simulation.getTimeDifference(lastTime, parts[1]);
            lastTime = parts[1];
            this.events.push(new Event(
                parts[0], t, parts[2], parts[3], parts[4], parts[5], parts[6], index
            ));
        }.bind(this));

        this._rebuildEvents();
    }

    //get the time difference in seconds
    static getTimeDifference(t1, t2){
        //since everything happened on the same day, ignore the date part
        let parts1 = t1.split(" ")[1].split(":");
        let parts2 = t2.split(" ")[1].split(":");

        let time1 = parseInt(parts1[0]) * 3600 + parseInt(parts1[1]) * 60 + parseInt(parts1[2]);
        let time2 = parseInt(parts2[0]) * 3600 + parseInt(parts2[1]) * 60 + parseInt(parts2[2]);

        return time2 - time1;
    }

    //rebuild events by injecting the parking decision into the array
    _rebuildEvents(){
        //find all the events for when the taxi just dropped a passenger
        var pEvents = [];

        for(let i = 1; i < this.events.length; i++){
            if( this.events[i].status == "0" && this.events[i-1].status == "1" )
                pEvents.push(this.events[i]);
        }

        var totalInjections = Math.floor(this.probability / 100 * pEvents.length);
        var indices = [];

        while( indices.length < totalInjections ){
            let index = Math.floor(Math.random() * pEvents.length);
            if( !indices.includes(pEvents[index].index) ){
                indices.push(pEvents[index].index);
            }
        }

        var finalEvents = [];
        for( let event of this.events ){
            if( indices.includes(event.index) ){
                //parking is between 10 and 60 minutes for now
                let t = (Math.floor(Math.random() * 51) + 10) * 60;//in seconds

                let ev = new Event(event.id, t, event.longitude, event.latitude, event.speed,
                    event.northAngle, 2, 0);

                finalEvents.push(ev);
            }
            finalEvents.push(event);
        }

        for(let i = 0; i < finalEvents.length; i++)
            finalEvents[i].index = i;


        this.events = finalEvents;
    }

    start(){
        this.currentEvent = this.events[0];
        this._beginEvent(this.currentEvent);

        var interval = setInterval(function(){
            this.time += 1000;

            //check if the current event has elapsed
            if( this.time >= this.currentEvent.time * 1000 ){
                this._endEvent(this.currentEvent);
                this.time = 0;
                //check if this is the last event
                if( this.currentEvent.index + 1 == this.events.length ){
                    clearInterval(interval);
                    this._endSimulation();
                    return;
                }
                this.currentEvent = this.events[this.currentEvent.index + 1];
                this._beginEvent(this.currentEvent);
            }
        }.bind(this), 1000 / this.speed);
    }

    //do activities that allows this event to begin
    _beginEvent(event){
        console.log("beginning new event...");
        this.CarActions.changeLocation(event.longitude, event.latitude);

        if( event.status == 2 ){//request parking
            let data = {
                messageType: 1, //request
                occupancyCar: this.CarActions.getCarID(),
                loc_latitude: event.latitude,
                loc_longitude: event.longitude,
                park_latitude: event.latitude,
                park_longitude: event.longitude,
                maxDistance: Math.floor(Math.random() * 300 + 100), //between 100 and 400 metres
                duration: event.time,
                maxCost: 10, //10 dollars for now
                allowSuggestions: 1,
                lotID: -1,
                spotID: -1
            };
            console.log("requesting for parking");
            this.CarActions.request(data);
        }
    }


    //do any close up activity for this event
    _endEvent(event){
        if( event.status == 2 && this.currentParking != null ){
            let data = {
                messageType: 4, //leave
                occupancyCar: this.currentParking.occupancyCar,
                loc_latitude: event.latitude,
                loc_longitude: event.longitude,
                park_latitude: this.currentParking.latitude,
                park_longitude: this.currentParking.longitude,
                maxDistance: this.currentParking.distance,
                duration: this.currentParking.duration,
                maxCost: this.currentParking.cost, //10 dollars for now
                allowSuggestions: 0,
                lotID: this.currentParking.lotID,
                spotID: this.currentParking.spotID
            };

            this.CarActions.leave(data);
            this.currentParking = null;
        }
    }

    _endSimulation(){
        console.log("Simulation eneded!!!");
    }

    saveParking(parking){
        this.currentParking = parking;
    }
}

module.exports = Simulation;
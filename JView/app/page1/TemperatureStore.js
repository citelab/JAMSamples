//Store File for TemperatureStore
import { autorun, observable, computed} from 'mobx';
class TemperatureStore{
reset(){this.map=this.map.map(e=>{return 0})}changeValue(value,param){this.map[param]=value;}addCommand(command, commandListName){this.map[commandListName].push(command)}
@observable array = [[],[]];
@computed get graph (){
        var devices = this.array.toJSON().map(device => (device.toJSON()));
        var data = [];
        devices.forEach(function (e) {
            data.push(e.map(dataPoints => dataPoints.toJSON()))
        });
        var option={
            title:{
                text: 'Graph Chart'
            },
            tooltip: {
                trigger: 'none',
                axisPointer:{
                    type:'cross'
                }
            },
            dataZoom: {
                show: true,
                start : 70
            },
            legend:{
                data: data.map((e,idx)=>{return 'Device-'+idx;})
            },
            grid:{
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel:true
            },
            xAxis:{
                type: 'value',
                splitLine: {
                    lineStyle: {
                        type: 'dashed'
                    }
                },
                scale:true
            },
            yAxis:[
                {
                    type:'value'
                }
            ],
            series: data.map((e,idx)=>{
                var obj = {};
                obj.name = 'device-'+idx;
                obj.type = 'line';
                obj.smooth = false;
                obj.data = e;
                return obj;
            })
        };
        return option;
    }
addDataPoints (x,y,gateIndex){                for (var i = 0; i < gateIndex - this.array.length + 1; i++) {this.array.push([]);}                this.array[gateIndex].push([x,y])};
                setArray(array,gateIndex){                for (var i = 0; i < gateIndex - this.array.length + 1; i++) {                this.array.push([]);            }            this.array[gateIndex]=array;            };
}var store = window.store = new TemperatureStore;export default store
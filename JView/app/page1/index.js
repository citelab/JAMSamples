// Root File for Page page1
import React from 'react';import {inject, observer} from 'mobx-react';import {Panel, FormSet, NavBar, FixTable, Controller, Terminal} from 'Components';import io from 'socket.io-client';import Echarts from 'Echarts/Echarts';
@inject("TemperatureStore","TempStore")
@observer
export default class page1 extends React.Component {
componentDidMount(){                        if(!this.socket) {                            this.socket = io.connect('/');                            this.socket.on('changeValue', body => {                                this.props.TemperatureStore.changeValue(body.value, body.name)                            });                            this.socket.on('newDataPoint', function(data){                                if(data.body.id==='temp')this.props.TemperatureStore.addDataPoints(data.body.x, data.body.y, data.body.gateIndex)
if(data.body.id==='pos')this.props.TempStore.addDataPoints(data.body.x, data.body.y, data.body.gateIndex)}.bind(this));                            this.socket.on('setArray', function(data){if(data.body.id==='temp')this.props.TemperatureStore.setArray(data.array, data.body.gateIndex)
if(data.body.id==='pos')this.props.TempStore.setArray(data.array, data.body.gateIndex)}.bind(this));}}
render(){const TemperatureStore_graph = this.props.TemperatureStore.graph;
return <div><Panel title = "Temperature">                        <Echarts style={{width:'100%',height:'365px'}} option={TemperatureStore_graph}/>                    </Panel>
</div>}
};
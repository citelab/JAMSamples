// Root File for The Tree Flow app
import React from 'react';// Import boilerplates
import ReactDOM from 'react-dom';import createBrowserHistory from 'history/createBrowserHistory';import { Provider } from 'mobx-react';import { BrowserRouter as Router, Route , hashHistory} from 'react-router-dom';import { RouterStore, syncHistoryWithStore } from 'mobx-react-router';import {NavBar} from 'Components';const app = document.getElementById('app');// Import Mobx Stores :
import TemperatureStore from './page1/TemperatureStore';;import TempStore from './page2/TempStore';
import page1 from './page1';import page2 from './page2'
const browserHistory = createBrowserHistory();const RoutingStore = new RouterStore();
var stores = {RoutingStore,TemperatureStore,TempStore};
var routes = [{dispLabel: 'page1', route:'/page1'},,{dispLabel: 'page2', route:'/page2'},];    ReactDOM.render(    <Provider {...stores}><Router history={browserHistory}><div><NavBar routes={routes}/><Route path='/page1' component={page1}/>
<Route path='/page2' component={page2}/></div></Router></Provider>, app)
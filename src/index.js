import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import 'antd/dist/antd.less';
import {Provider} from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import promiseMiddleware from 'redux-promise';
import ReduxThunk from 'redux-thunk'
import  Reducer from './_reducers/index';
import reportWebVitals from './reportWebVitals';


const createStoreWithMiddleware = applyMiddleware(promiseMiddleware, ReduxThunk)(createStore)
ReactDOM.render(
  <Provider
    store={createStoreWithMiddleware(Reducer,
        window.__REDUX_DEVTOOLS_EXTENSION__&&
        window.__REDUX_DEVTOOLS_EXTENSION__()
      )}  
  >
    <App />
  </Provider>,
  document.getElementById('root')
);

reportWebVitals();

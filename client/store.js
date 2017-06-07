const { createStore, combineReducers } = require('redux');
const https = require('https');

const reducer = combineReducers({

});

const store = createStore(reducer);

module.exports = store;
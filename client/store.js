const { createStore, combineReducers } = require('redux');
const https = require('https');

const usernameInput = (state = '', action) => {
  switch (action.type) {
    case 'INPUT_CHANGED':
      return action.text;
    case 'SEARCH_COMPLETE':
      return action.text;
    default:
      return state;
  }
}

const userProfile = (state = {}, action) => {
  switch (action.type) {
    case 'SHOW_PROFILE':
      return action.profile;
    default:
      return state;
  }
}

const reducer = combineReducers({
  usernameInput,
  userProfile
});

const store = createStore(reducer);

module.exports = store;
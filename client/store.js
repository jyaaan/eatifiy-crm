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

const userProfile = (state = { profile: { id: -1 }, followingBtn: false }, action) => {
  switch (action.type) {
    case 'SHOW_PROFILE':
      return { profile: action.profile };
    case 'DISABLE_FOLLOWING':
      return { followingBtn: action.show, profile: state.profile };
    case 'ENABLE_FOLLOWING':
      return { followingBtn: action.show, profile: state.profile };
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
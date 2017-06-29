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

const defaultParameters = {
  engagement: {
  },
  follower_count: {

  },
  following_count: {

  },
  external_url: {

  },
  ratio: {
    
  }
}

const prospectParameters = (state = defaultParameters, action) => {
  switch (action.type) {
    case 'UPDATE_PARAMETERS':
      const newObj = Object.assign({}, state[action.name], action.parameters[action.name]);
      const masterObj = {};
      masterObj[action.name] = newObj;
      console.log(newObj);
      return Object.assign({}, state, masterObj);
    default:
      return state;
  }
}

const reducer = combineReducers({
  usernameInput,
  userProfile,
  prospectParameters
});

const store = createStore(reducer);

module.exports = store;
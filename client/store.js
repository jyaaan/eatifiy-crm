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
    case 'DISABLE_FOLLOWING': // For the button. For when we implement follower overlap
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
    min: 0
  },
  ratio: {
  }
}

const prospectParameters = (state = {parameters: defaultParameters, type: {}}, action) => {
  switch (action.type) {
    case 'UPDATE_PARAMETERS': // will effectively merge incoming parameter object with existing, overwriting any changes
      const newObj = Object.assign({}, state.parameters[action.name], action.parameters[action.name]);
      const paramObj = {};
      paramObj[action.name] = newObj;
      return {parameters: Object.assign({}, state.parameters, paramObj), type: state.type};
    case 'RENDER_PARAMETER_OBJECT': // What happens when you hit go
      console.log(state);
    return state;
    case 'UPDATE_TYPE': // same as UPDATE_PARAMETER but just not as complex
      const typeObj = Object.assign({}, state.type, action.parameters);
      return { parameters: state.parameters, type: typeObj };
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
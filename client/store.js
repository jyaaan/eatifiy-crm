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
  },
  terms: {
  }
}

const prospectParameters = (state = {parameters: defaultParameters, type: {}}, action) => {
  switch (action.type) { // simplify Object.assign logic
    case 'UPDATE_PARAMETERS': // will effectively merge incoming parameter object with existing, overwriting any changes
      const newObj = Object.assign({}, state.parameters[action.name], action.parameters[action.name]);
      const paramObj = {};
      paramObj[action.name] = newObj;
      return {parameters: Object.assign({}, state.parameters, paramObj), type: state.type};
    case 'UPDATE_TYPE': // same as UPDATE_PARAMETER but just not as complex
      const typeObj = Object.assign({}, state.type, action.parameters);
      return { parameters: state.parameters, type: typeObj };
    case 'RENDER_PARAMETER_OBJECT': // What happens when you hit go
      fetch('/ui-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
      return state;
    default:
      return state;
  }
}

const initProgress = {
  show: true,
  stage: 'init',
  total: null,
  progress: null
};

const prospectProgress = (state = initProgress, action) => {
  switch (action.type) {
    case 'HIDE_PROGRESS':
      return Object.assign({}, state, { show: false });
    case 'SHOW_PROGRESS':
      return Object.assign({}, state, { show: true });
    case 'CHANGE_STAGE':
      console.log('attempting to change stage to', action.stage);
      console.log('currently:', state);
      return Object.assign(state, {stage: action.stage});
    case 'UPDATE_STATUS':
      return Object.assign(state, action.status);
    default:
      return state;
  }
}

const enrichCSV = (state = {}, action) => {
  switch (action.type) {
    case 'ENRICH_CSV':
      fetch('/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.users)
      });
      return state;
    default:
      return state;
  }
}

const reducer = combineReducers({
  usernameInput,
  userProfile,
  prospectParameters,
  prospectProgress,
  enrichCSV
});

const store = createStore(reducer);

module.exports = store;
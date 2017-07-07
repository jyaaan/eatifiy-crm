const React = require('react');
const ReactDOM = require('react-dom');
const store = require('./store');
const UsernameInput = require('./input-username');
const UserProfile = require('./user-profile');
const ProspectParameters = require('./prospect-parameters');
const ProspectProgress = require('./prospect-progress');

const render = () => {
  const state = store.getState();
  ReactDOM.render(
    <div className='ui container'>
      <UsernameInput text={ state.usernameInput } />
      <UserProfile { ...state.userProfile } />
      <ProspectParameters />
      <ProspectProgress { ...state.prospectProgress } />
    </div>,
    document.querySelector('#container')
  );
}

store.subscribe(render);

render();
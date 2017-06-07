const React = require('react');
const ReactDOM = require('react-dom');
const store = require('./store');
const UsernameInput = require('./input-username');
const UserProfile = require('./user-profile');

const render = () => {
  const state = store.getState();
  ReactDOM.render(
    <div className='ui grid'>
      <UsernameInput text={ state.usernameInput } />
      <UserProfile { ...state.userProfile } />
    </div>,
    document.querySelector('#container')
  );
}

store.subscribe(render);

render();
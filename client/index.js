const React = require('react');
const ReactDOM = require('react-dom');
const store = require('./store');
const UsernameInput = require('./input-username');
const UserProfile = require('./user-profile');
const ProspectParameters = require('./prospect-parameters');
const ProspectProgress = require('./prospect-progress');

var io = require('socket.io-client');
var socket = io('/');

socket.on('welcome', data => {
  console.log(data);
})

socket.on('dispatch', data => {
  store.dispatch(data);
})
console.log(socket);
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
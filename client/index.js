const React = require('react');
const ReactDOM = require('react-dom');
const store = require('./store');
const UsernameInput = require('./input-username');
const UserProfile = require('./user-profile');
const ProspectParameters = require('./prospect-parameters');
const ProspectProgress = require('./prospect-progress');
const EasyFilter = require('./easy-filter');
const ProspectList = require('./prospect-list');

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
      <EasyFilter { ...state.easyFilter } />
    </div>,
    document.querySelector('#container')
  );
}

      // <ProspectList { ...state.prospectList } />
      // <ProspectProgress { ...state.prospectProgress } />
store.subscribe(render);

render();
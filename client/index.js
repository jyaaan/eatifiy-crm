const React = require('react');
const ReactDOM = require('react-dom');
const store = require('./store');
// const UserProfile = require('./user-profile');
// const ProspectParameters = require('./prospect-parameters');
// const EasyFilter = require('./easy-filter');
const FileLoader = require('./file-loader');
const render = () => {
  const state = store.getState();
  ReactDOM.render(
    <div className='ui container'>
      <FileLoader />
    </div>,
    document.querySelector('#container')
  );
}

store.subscribe(render);

render();
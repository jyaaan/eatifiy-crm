const React = require('react');
const ReactDOM = require('react-dom');
const store = require('./store');

const render = () => {
  const state = store.getState();
  ReactDOM.render();
}

store.subscribe(render);

render();
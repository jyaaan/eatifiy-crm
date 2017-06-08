const React = require('react');
const store = require('./store');
const http = require('http');
const https = require('https');
const request = require('request');

const UsernameInput = props => {
  const { text } = props;

  const handleChange = event => {
    store.dispatch({
      type: 'INPUT_CHANGED',
      text: event.target.value
    });
  };

  const handleSubmit = event => {
    event.preventDefault();
    const username = store.getState().usernameInput;
    fetch('/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    })
      .then(result => result.json())
      .then(user => {
        console.log(user);
        store.dispatch({
          type: 'SHOW_PROFILE',
          profile: user
        });
        store.dispatch({
          type: 'DISABLE_FOLLOWING',
          show: false
        })
      });
  };
  return (
    <div className='four column centered row'>
      <div className='ui action input'>
        <input
          type='text'
          placeholder='IG Username'
          onChange={ handleChange }>
        </input>
        <button
          className='ui button column'
          onClick={ handleSubmit }>Look Up</button>
      </div>
    </div>
  );
}

module.exports = UsernameInput;
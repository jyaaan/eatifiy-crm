const React = require('react');
const store = require('./store');
const async = require('async');
const Dropdown = require('semantic-ui-react').Dropdown;
const Button = require('semantic-ui-react').Button;
const Input = require('semantic-ui-react').Input;
const handleToggle = event => {
  console.log('toggled');
  console.log('value:', event.target.checked);
  // if (event.target.value == 'on') {
  //   event.target.value = 'off';
  // } else {
  //   event.target.value = 'on';
  // }
}

friendOptions = [
  {
    text: 'Likers of Recent Posts',
    value: 'likers'
  },
  {
    text: 'Followers of Account',
    value: 'followers'
  },
  {
    text: 'Following of Account',
    value: 'following'
  }
]

const handleProspect = event => {
  console.log(store.getState().prospectParameters)
}

const handleDropdown = (event, { value }) => {
  console.log(event.target);
  console.log(value);
}

const handleTest = (event, {value}) => {
  console.log(event.target.checked);
  console.log(event.target);
  const idSlug = event.target.value;
  let $temp = document.querySelector('#' + idSlug)
  if ($temp.value == '') {
    console.log('blanker!');
    $temp.value = $temp.placeholder;
  }
  const spec = idSlug.substr(0, idSlug.indexOf('-'));
  const name = idSlug.substr(idSlug.indexOf('-') + 1, idSlug.length);
  const subb = {};
  if (event.target.checked) {
    subb[spec] = $temp.value;
  } else {
    subb[spec] = null;
  }
  const parameters = {};
  parameters[name] = subb;
  store.dispatch({
    type: 'UPDATE_PARAMETERS',
    name: name,
    parameters: parameters
  })

  console.log($temp.value);
}

const handleInput = event => {
  const idSlug = event.target.id;
  const $check = document.querySelector('#' + idSlug + '-check');
  const spec = idSlug.substr(0, idSlug.indexOf('-'));
  const name = idSlug.substr(idSlug.indexOf('-') + 1, idSlug.length);
  const parameters = {};
  const subb = {};
  subb[spec] = event.target.value;
  parameters[name] = subb;
  if ($check.checked) {
    store.dispatch({
      type: 'UPDATE_PARAMETERS',
      name: name,
      parameters: parameters
    })
  } else {
    console.log('not checked');
  }
}
const ProspectParameters = props => {
  console.log('prospect paramters');
  // store.dispatch({
  //   type: 'SHOW_PARAMETERS'
  // });

  handleRef = c => {
    this.inputRef = c;
    console.log(c);
  }

  focus = () => {
    console.log(this.inputRef);
    this.inputRef.focus();
  }

  return (
    <div className="ui form">
      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox"
            id="min-follower_count-check"
            value="min-follower_count"
            onClick={ handleTest } />
          <label>Min Followers</label>
        </div>
        <div className="ui input">
          <input type="text"
            placeholder="5,000"
            id="min-follower_count"
            onChange={ handleInput } />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox"
            id="max-follower_count-check"
            value="max-follower_count"
            onClick={ handleTest } />
          <label>Max Followers</label>
        </div>
        <div className="ui input">
          <input type="text"
            placeholder="250,000"
            id="max-follower_count"
            onChange={ handleInput } />
        </div>
      </div>

      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox"
            id="min-following_count-check"
            value="min-following_count"
            onClick={ handleTest } />
          <label>Min Following</label>
        </div>
        <div className="ui input">
          <input type="text"
            placeholder="0"
            id="min-following_count"
            onChange={ handleInput } />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox"
            id="max-following_count-check"
            value="max-following_count"
            onClick={ handleTest } />
          <label>Max Following</label>
        </div>
        <div className="ui input">
          <input type="text"
            placeholder="2,000"
            id="max-following_count"
            onChange={ handleInput } />
        </div>
      </div>

      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox"
            id="min-ratio-check"
            value="min-ratio"
            onClick={ handleTest } />
          <label>Min Following/Follower Ratio</label>
        </div>
        <div className="ui input">
          <input type="text" 
            placeholder="0.00"
            id="min-ratio"
            onChange={ handleInput } />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox"
            id="max-ratio-check"
            value="max-ratio"
            onClick={ handleTest } />
          <label>Max Following/Follower Ratio</label>
        </div>
        <div className="ui input">
          <input type="text"
            placeholder="0.2"
            id="max-ratio"
            onChange={ handleInput } />
        </div>
      </div>

      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox" 
            id="min-engagement-check" 
            value="min-engagement" 
            onClick={ handleTest }/>
          <label>Min EngagementRate</label>
        </div>
        <div className="ui input">
          <input type="text" 
            id="min-engagement"
            placeholder="0.02"
            onChange={ handleInput } />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox" 
            id="max-engagement-check"
            value="max-engagement"
            onClick={ handleTest }/>
          <label>Max EngagementRate</label>
        </div>
        <div className="ui input">
          <input type="text" 
            id="max-engagement"
            placeholder="0.10"
            onChange={ handleInput } />
        </div>
      </div>

      <div className="inline field four columns">
        <Dropdown placeholder='Prospecting Method' fluid selection options={friendOptions} 
          onChange={handleDropdown}/>
      </div>
      <div className="inline field">
        <div className="ui toggle checkbox">
          <input 
            type="checkbox" 
            tabIndex="0" 
            onClick={ handleToggle } />
          <label>Require Website</label>
        </div>
        <button
          className="ui button"
          onClick={ handleProspect }>Begin Prospectin'</button>
      </div>

    </div>
  )
}

module.exports = ProspectParameters;
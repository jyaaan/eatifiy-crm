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
            type="checkbox" />
          <label>Min Followers</label>
        </div>
        <div className="ui input">
          <input type="text" value="5,000" />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox" />
          <label>Max Followers</label>
        </div>
        <div className="ui input">
          <input type="text" value="250,000" />
        </div>
      </div>

      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox" />
          <label>Min Following</label>
        </div>
        <div className="ui input">
          <input type="text" value="0" />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox" />
          <label>Max Following</label>
        </div>
        <div className="ui input">
          <input type="text" value="2,000" />
        </div>
      </div>

      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox" />
          <label>Min Following/Follower Ratio</label>
        </div>
        <div className="ui input">
          <input type="text" value="0.00" />
        </div>
        <div className="ui checkbox">
          <input
            type="checkbox" />
          <label>Max Following/Follower Ratio</label>
        </div>
        <div className="ui input">
          <input type="text" value="0.2" />
        </div>
      </div>

      <div className="inline field">
        <div className="ui checkbox">
          <input
            type="checkbox" />
          <label>Min EngagementRate</label>
        </div>
        <div className="ui input">
          <input type="text" value="0.02" />
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

      <div>
        <Button content='focus' onClick={this.focus} />
        <Input ref={this.handleRef} placeholder='Search...' />
      </div>

    </div>
  )
}

module.exports = ProspectParameters;
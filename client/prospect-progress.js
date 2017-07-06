const React = require('react');
const store = require('./store');
const Dropdown = require('semantic-ui-react').Dropdown;
const Button = require('semantic-ui-react').Button;
const Input = require('semantic-ui-react').Input;
const Progress = require('semantic-ui-react').Progress;

const ProspectProgress = params => {
  var { stage, total, show, progress } = params;
  console.log('deez params:', params);
  var progressPercent = total > 0 ? (progress / total * 100).toFixed(2) : 0;
  if (!show) return null;
  switch (stage) {
    case 'init':
      return (
        <div>
          <p>Initializing influencer prospect gathering</p>
        </div>
      );
    case 'medias':
      return (
        <div>
          <p>Gathering posts for user</p>
        </div>
      );
    case 'likers':
      return (
        <div>
          <p>Getting likers for { progress } posts out of { total }.</p>
          <Progress percent={ progressPercent } indicating progress="percent" value={ progress } total={ total } />
        </div>
      );
    case 'users':
      return (
        <div>
          <p>Pulling data for user { progress } out of { total }.</p>
          <Progress percent={ progressPercent } indicating progress="percent" value={ progress } total={ total } />
        </div>
      );
    case 'filter':
      return (
        <div>
          <p>Data pull complete, finding influencers.</p>
        </div>
      )
    case 'write':
      return (
        <div>
          <p>Writing results to file, please hold.</p>
        </div>
      );
    default:
      return;
  }
  // return (
  //   <div>
  //     <h2>BRO!</h2>
  //     <p>Stage: { stage }</p>
  //     <p>Progress: { progress }</p>
  //     <p>Total: { total }</p>
  //     <Progress percent={ progressPercent } indicating progress="percent" value={ progress } total={ total }/>
  //   </div>
  // );
}

module.exports = ProspectProgress;
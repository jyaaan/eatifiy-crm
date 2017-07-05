const React = require('react');
const store = require('./store');
const Dropdown = require('semantic-ui-react').Dropdown;
const Button = require('semantic-ui-react').Button;
const Input = require('semantic-ui-react').Input;
const Progress = require('semantic-ui-react').Progress;

const ProspectProgress = params => {
  const { stage, total, show, progress } = params;
  var progressPercent = total > 0 ? (progress / total * 100).toFixed(2) : 0;
  if (!show) return null;
  return (
    <div>
      <h2>BRO!</h2>
      <p>Stage: { stage }</p>
      <p>Progress: { progress }</p>
      <p>Total: { total }</p>
      <Progress percent={ progressPercent } indicating progress="percent" value={ progress } total={ total }/>
    </div>
  );
}

module.exports = ProspectProgress;
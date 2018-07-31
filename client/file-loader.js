const React = require('react');
const store = require('./store');
const csv = require('csvtojson');
const Input = require('semantic-ui-react').Input;

const handleFile = event => {
  var data = null;
  var file = event.target.files[0];
  var reader = new FileReader();
  console.log('handleFile');
  reader.readAsText(file);
  reader.onload = function (loadEvent) {
    var csvData = loadEvent.target.result;
    // console.log(csvData);
    csv()
    .fromString(csvData)
    .then(leadObject => {
      // console.log(leadObject);
      alert('attempting to import ' + leadObject.length + ' leads.');
      store.dispatch({
          type: 'UPLOAD_LEADS',
          leads: leadObject
      });
    })
    // old v1 stuff
    // .on('end_parsed', leads => {
    //   console.log(leads);
    //   alert('attempting to import ' + leads.length + ' leads.');
    //   store.dispatch({
    //       type: 'UPLOAD_LEADS',
    //       leads: leads
    //   });
    // })
        reader.onerror = function () {
      alert('Unable to read' + ' ' + file.fileName);
    }
  }
}

const handleChange = event => {
  store.dispatch({
    type: 'API_KEY_INPUT_CHANGED',
    key: event.target.value
  });
};

const FileLoader = props => {
  return (
    <div className='ui eight column centered row'>
      <div className='ui action input'>
        <input
          type='text'
          placeholder='API Key'
          onChange={handleChange}>
        </input>

      </div>
      <div>
        <legend>Upload your leads</legend>
        <input type="file"
          name="File Upload"
          id="csv-upload"
          accept=".csv"
          onChange={handleFile} />
      </div>
    </div>
  )
}

module.exports = FileLoader;
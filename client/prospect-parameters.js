const React = require('react');
const store = require('./store');
const Button = require('semantic-ui-react').Button;
const Input = require('semantic-ui-react').Input;

const handleFile = event => {
  var data = null;
  var file = event.target.files[0];
  var reader = new FileReader();
  var usernames = [];

  reader.readAsText(file);
  reader.onload = function (loadEvent) {
    var csvData = loadEvent.target.result;
    var testArray = csvData.split('\n');
    console.log(testArray.length);
    console.log(testArray.slice(-1));
    console.log(testArray.length);
    testArray.splice(-1, 1);
    console.log(testArray);
    var latestArray = testArray.map(arr => {
      return arr.replace('\r', '');
    })

    store.dispatch({
      type: 'ENRICH_CSV',
      users: testArray
    })
    // store.dispatch({
    //   type: 'UPLOAD_PROSPECTS',
    //   prospects: latestArray,
    //   primaryUsername: store.getState().usernameInput
    // });
  }
}

// exporting brands
const exportBrands = event => {
  fetch('/brands')
    .then(resp => resp.json())
    .then(brands => {
      const allBrands = brands.map(brand => {
        return brand.username;
      })
      downloadCSV(allBrands);
    })
}

const downloadCSV = (rows) => {
  exportToCsv('brands.csv', rows);
}

function exportToCsv(filename, rows) {
  var processRow = function (row) {
    var finalVal = '';
    finalVal += row;
    finalVal += ',';
    return finalVal + '\n';
  };

  var csvFile = '';
  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// Currently too verbose. When refactoring, learn React a bit better to replace this mess.
const ProspectParameters = props => {
  return (
    <div className="ui form">
      <div>
        <button
          className='ui button'
          onClick={ exportBrands }>Export Brands</button>
      </div>

      <div>
        <legend>Upload your CSV File</legend>
        <input type="file" 
          name="File Upload" 
          id="csv-upload" 
          accept=".csv"
          onChange={ handleFile } />
      </div>
    </div>
  )
}

module.exports = ProspectParameters;
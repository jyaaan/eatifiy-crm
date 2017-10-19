const fs = require('fs');

function fileHandler() {

}

fileHandler.prototype.writeToCSV = (data, filename, headers = []) => {
  return new Promise((resolve, reject) => {
    var lineArray = [];
    lineArray.push(headers);

    const tempStore = data.map(datum => {
      return datum + ',';
    });

    lineArray = lineArray.concat(...tempStore);
    const csvContent = lineArray.join('\n');

    fs.writeFile(
      './server/public/csv/' + filename + '.csv',
      csvContent,
      err => {
        if (err) {
          console.error('CSV Write Error');
          reject(err);
        } else {
          console.log(filename + '.csv saved :3');
          resolve('Write Successful');
        }
      }
    )
  });
}

fileHandler.prototype.saveCSV = (csv, filename) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      './server/public/csv/' + filename + '.csv',
      csv,
      err => {
        if (err) {
          console.error('CSV Save Error');
          reject(err);
        } else {
          console.log(filename + '.csv saved :3');
          resolve('Save Successful');
        }
      }
    );
  })
}

const convertAndSend = (array, header, url) => {
  console.log('testing csv send');
  var rows = [
    ['username', 'external_id'],
    ...array
  ];
  var processRow = function (row) {
    var finalVal = '';
    finalVal += row;
    // finalVal += ',';
    return finalVal + '\n';
  };
  var csvFile = '';
  rows.map(row => {
    csvFile += processRow(row);
  })
  signal(csvFile, url);
  // fileHandler.saveCSV(csvFile, 'aaaa output');
}

const signal = (csvFile, url) => {
  var options = {
    url: url,
    method: 'PUT',
    headers: [
      {
        name: 'Content-Type',
        value: 'application/csv'
      }
    ],
    body: csvFile
  };
  // console.log('if this shows, we\'ve done something');
  request(options);
  console.log('submission complete');
}


module.exports = fileHandler;
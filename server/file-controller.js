const fs = require('fs');
const request = require('request');
function fileHandler() {

}

fileHandler.prototype.downloadFile = (url, filename) => {
  return new Promise((resolve, reject) => {
    request.head(url, (err, res, bod) => {
      request(url).pipe(fs.createWriteStream('./tmp/images/' + filename)).on('close', () => {
        resolve('../tmp/images/' + filename);
      })
    })
  })
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

fileHandler.prototype.convertAndSend = (array, header, url) => {
  console.log('testing csv send');
  var rows = [
    header,
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
  this.signal(csvFile, url);
  // fileHandler.saveCSV(csvFile, 'aaaa output');
}

fileHandler.prototype.signal = (csvFile, url) => {
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
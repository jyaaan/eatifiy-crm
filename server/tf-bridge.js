const request = require('request');
const Database = require('./database').Database;
const database = new Database();

function TFBridge() {

}

TFBridge.prototype.getProspectList = function (listURL, token, batchID) {

}

TFBridge.prototype.submitProspects = function (url, users) {
  convertAndSend(users, ['username', 'external_id'], url);
}

TFBridge.prototype.downloadProspects = function (url) {
  var options = {
    url: url,
    method: 'GET'
  };
  request(options, (err, res, bod) => {
    if (err) {

    } else {
      const bodyObj = JSON.parse(bod);
      console.log(Object.keys(bodyObj));
      console.log(bodyObj);
    }
  });

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
  request(options);
  console.log('submission complete');
}

module.exports = TFBridge;

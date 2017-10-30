const request = require('request');
const Database = require('./database').Database;
const database = new Database();
const async = require('async');

function TFBridge() {

}

TFBridge.prototype.getProspectList = function (listURL, token, batchID) {

}

TFBridge.prototype.submitProspects = function (url, users) {
  convertAndSend(users, ['username', 'external_id'], url);
}
// first get meta data. 
// 
TFBridge.prototype.downloadProspects = function (url, jobId) {
  var options = {
    url: url,
    method: 'GET'
  };
  request(options, (err, res, bod) => {
    if (err) {

    } else {
      const bodyObj = JSON.parse(bod);
      console.log(Object.keys(bodyObj));
      var pageTracker = new Array(bodyObj.meta.total_pages);
      for (let i = 0; i < pageTracker.length; i++) {
        pageTracker[i] = i + 1;
      }
      async.mapSeries(pageTracker, (page, next) => {
        //load, confirm, 
        var currOption = {
          url: url + '&page=' + page,
          method: 'GET'
        }
        getRequest(currOption)
          .then(result => {
            // parse out the 
            // result.instagram_users.map(user => {

            // });
            async.mapSeries(result.instagram_users, (user, cb) => {
              //parse, return user object that can be upserted to database

              // upsert to db

              // fill user_id column in prospects table for corresponding thingof thing
              // need job id, 
            });
            // console.log(result.instagram_users[0]);
            next();
          })
      })
      // console.log(pageTracker);
    }
  });

}

const parseUserData = rawData => {
  
}

const getRequest = (options, object = 'bod') => {
  return new Promise((resolve, reject) => {
    request(options, (err, res, bod) => {
      if (object = 'bod') {
        resolve(JSON.parse(bod));
      } else {
        resolve(res);
      }
    })
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
  request(options);
  console.log('submission complete');
}

module.exports = TFBridge;

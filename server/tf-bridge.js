const request = require('request');
const Database = require('./database').Database;
const database = new Database();
const async = require('async');
const FileHandler = require('./file-controller');
const fileHandler = new FileHandler();

function TFBridge() {

}

TFBridge.prototype.getProspectList = function (listURL, token, batchID) {

}

TFBridge.prototype.createProspectList = function (username, staging = true) {
  var url = 'https://' + (staging ? 'staging.' : 'app.') + 'truefluence.io/:' + username + '/lists.json'
  var options = {
    url: url,
    method: 'POST',
    headers: [
      {
        name: 'Content-Type',
        value: 'application/csv'
      }
    ],
    body: csvFile
  };
}

TFBridge.prototype.submitProspects = function (url, users) {
  convertAndSend(users, ['username', 'external_id'], url);
}
// first get meta data. 
// 

TFBridge.prototype.verifyList = (url) => {
  return new Promise((resolve, reject) => {
    const options = {
      url: url,
      method: 'GET'
    }
    request(options, (err, res, bod) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        const bodyObj = JSON.parse(bod);
        resolve(!(bodyObj.list.refreshing));
        // bodyObj.list.refreshing
        // bodyObj.instagram_users.length == 0
        // '&skip_medias=true&skip_counts=true&filters[unrefreshed]=true&per_page=1'
      }
    })
  })
}

TFBridge.prototype.downloadProspects = function (url, jobId) {
  const perPage = 1000;
  console.log('starting download of prospects');
  const timeStart = Date.now();
  var userDebug = [];
  //skip_medias=true&skip_counts=true&filters[unrefreshed]=true&per_page=1
  var options = {
    url: url + '&skip_medias=true&per_page=' + perPage + '&page=1',
    method: 'GET'
  };
  var processUserCount = 0;
  console.log(options.url);
  return new Promise((resolve, reject) => {
    request(options, (err, res, bod) => {
      if (err) {
        console.error(err);
      } else {
        // try {
        //   const bodyObj = JSON.parse(res.body);
        // }
        // catch (err) {
        //   const bodyObj = JSON.parse(bod);
        // }
        const bodyObj = JSON.parse(bod);
        console.log(Object.keys(bodyObj));
        var pageTracker = new Array(bodyObj.meta.total_pages);
  
        for (let i = 0; i < pageTracker.length; i++) {
          pageTracker[i] = i + 1;
        }
        console.log('creatd page tracker of length:', pageTracker.length);
        async.mapSeries(pageTracker, (page, next) => {
          //load, confirm, 
          var currOption = {
            url: url + '&skip_medias=true&skip_counts=true&per_page=' + perPage + '&page=' + page,
            method: 'GET'
          }
          console.log('trying:', currOption.url);
          getRequest(currOption)
            .then(result => {
              // parse out the 
  
              async.mapSeries(result.instagram_users, (user, cb) => {
                const parsedUser = parseUserData(user);

                database.upsertUser(parsedUser)
                  .then(result => {
                    userDebug.push([parsedUser.username, result]);
                    // fill user_id column in prospects table for corresponding thingof thing
                    // need job id, 
                    const updateProspect = {
                      user_id: result,
                      prospect_job_id: jobId,
                      username: parsedUser.username
                    };
                    database.updateProspect(updateProspect)
                      .then(finisher => {
                        processUserCount++;
                        cb();
                      })
                      .catch(err => {
                        console.error('update prospect error', err);
                      })
                  })
                  .catch(err => {
                    console.error('update user error:', err);
                    cb();
                  })
              }, err => {
                console.log('finished page:', page);
                next();
              });
              // console.log(result.instagram_users[0]);
            })
        }, err => {
          const jobUpdate = {
            id: jobId,
            stage: 'Downloaded'
          }
          database.updateJob(jobUpdate)
            .then(result => {
              console.log('list downloaded, job updated');
              console.log('total users processed:', processUserCount);
              const timeComplete = Date.now();
              const duration = (timeComplete - timeStart) / 1000;
              console.log('time taken (sec):', duration);
              resolve({count: processUserCount, duration: duration});
              // done:
              // convertAndSend(userDebug, ['username', 'user_id'])
            })
        })
      }
    });
  })

}

const parseUserData = rawData => {
  var parsedUser = {
    external_id: rawData.external_id,
    username: rawData.username,
    picture_url: rawData.picture_url,
    full_name: rawData.full_name,
    external_url: rawData.website,
    bio: rawData.bio,
    following_count: rawData.following_count,
    follower_count: rawData.follower_count,
    post_count: rawData.post_count,
    recent_like_count: rawData.recent_like_count,
    recent_comment_count: rawData.recent_comment_count,
    recent_post_count: rawData.recent_post_count,
    recent_video_count: rawData.recent_video_count,
    days_since_last_post: rawData.days_since_last_post,
    recent_average_likes: rawData.recent_average_likes,
    recent_engagement_rate: rawData.recent_engagement_rate,
    recent_average_comments: rawData.recent_average_comments,
    recent_like_rate: rawData.recent_like_rate,
    recent_comment_rate: rawData.recent_comment_rate
  }
  return parsedUser;
}

const getRequest = (options) => {
  return new Promise((resolve, reject) => {
    request(options, (err, res, bod) => {
      try {
        const parsed = JSON.parse(res.body);
        resolve(parsed);
      }
      catch (err) {
        const parsed = JSON.parse(bod);
        resolve(parsed);
      }
    })
  })
}

const convertAndSend = (array, header, url) => {
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
  signal(csvFile, url);
  // fileHandler.saveCSV(csvFile, 'debug output');
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

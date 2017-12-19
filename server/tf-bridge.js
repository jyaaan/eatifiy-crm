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
/*
{
  statusCode: 200,
    body: {
    list: {
      id: 1535,
        created_at: "2017-12-07T23:05:56.017Z",
          updated_at: "2017-12-07T23:05:56.017Z",
            user_id: 6,
              settings: { },
      approved: false,
        token: "LB1qPbb9UV4zKNtvtJfN8j5V",
          count: 0,
            refreshed_at: null,
              message: "",
                name: "truefluence9",
                  notes: "",
                    indexed_at: null,
                      began_indexing_at: null,
                        refreshing: false,
                          can_download: true,
                            can_import: null,
                              can_delete_shown: null,
                                can_request_campaign: false
    },
    url: "https://search.truefluence.io/users/truefluence9/lists.json"
  },
  headers: {
    cache - control: "max-age=0, private, must-revalidate",
      content - type: "application/json; charset=utf-8",
        date: "Thu, 07 Dec 2017 23:05:56 GMT",
          etag: "W/"589d015763b20edf5767558897626551"",
            server: "nginx/1.12.1",
              vary: "Origin",
                x - content - type - options: "nosniff",
                  x - frame - options: "SAMEORIGIN",
                    x - request - id: "5f8336d2-1069-4834-b788-eef5a8a7904c",
                      x - runtime: "0.035060",
                        x - xss - protection: "1; mode=block",
                          content - length: "475",
                            connection: "Close"
  },
  request: {
    uri: {
      protocol: "https:",
        slashes: true,
          auth: null,
            host: "search.truefluence.io",
              port: 443,
                hostname: "search.truefluence.io",
                  hash: null,
                    search: "?api_token=LXJrk8BevkpMvGoNUA4SR3L1-u",
                      query: "api_token=LXJrk8BevkpMvGoNUA4SR3L1-u",
                        pathname: "/users/truefluence9/lists.json",
                          path: "/users/truefluence9/lists.json?api_token=LXJrk8BevkpMvGoNUA4SR3L1-u",
                            href: "https://search.truefluence.io/users/truefluence9/lists.json?api_token=LXJrk8BevkpMvGoNUA4SR3L1-u"
    },
    method: "POST",
      headers: {
      0: {
        name: "Content-Type",
          value: "application/csv"
      },
      accept: "application/json",
        content - type: "application/json",
          content - length: 47
    }
  }
}
*/
TFBridge.prototype.createProspectList = function (username, token) {
  console.log('attempting to create list for:', username);
  return new Promise((resolve, reject) => {
    var url = 'https://search.truefluence.io/users/truefluence9/lists.json?api_token=' + token;
    var options = {
      url: url,
      method: 'POST',
      headers: [
        {
          name: 'Content-Type',
          value: 'application/csv'
        }
      ],
      body: {
        name: username,
        type: 'List::Prospect'
      },
      json: true
    };
    request(options, (err, res, bod) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(res);
        const prospectListId = res.body.list.id;
        const token = res.body.list.token;
        resolve(res);
      }
    })
  })
}

TFBridge.prototype.submitProspects = function (url, users) {
  convertAndSend(users, ['username', 'external_id'], url);
}
// first get meta data. 
// 

TFBridge.prototype.verifyList = (url) => {
  console.log('verifying', url);
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
        resolve(bodyObj.list.refreshing);
      }
    })
  })
}

TFBridge.prototype.downloadProspects = function (url, jobId) {
  console.log('starting async download of prospects');

  const perPage = 1000;
  var processedUserCount = 0;
  var downloadErrorCount = 0;
  var scrollId = null;
  var latestInstagramUsers = 0;
  const timeStart = Date.now();
  var currentURL = url + '&skip_medias=true'
  return new Promise((resolve, reject) => {
    async.doWhilst(next => {
      var options = {
        url: currentURL,
        method: 'GET'
      };
      getRequest(options)
        .then(result => {
          scrollId = result.meta.scroll_id;
          latestInstagramUsers = result.instagram_users.length;
          if (result.meta.next_page_url == '' || typeof result.meta.next_page_url == undefined) {
            currentURL = null;
          } else {
            currentURL = result.meta.next_page_url;
          }
          processedUserCount += latestInstagramUsers;
          console.log('number of results received:', result.instagram_users.length);
          console.log('total processed:', processedUserCount);

          async.mapSeries(result.instagram_users, (user, cb) => {
            const parsedUser = parseUserData(user);

            database.upsertUser(parsedUser)
              .then(result => {
                // userDebug.push([parsedUser.username, result]);
                // fill user_id column in prospects table for corresponding thingof thing
                // need job id, 
                const updateProspect = {
                  user_id: result,
                  prospect_job_id: jobId,
                  username: parsedUser.username
                };
                database.updateProspect(updateProspect)
                  .then(finisher => {
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
            next();
          });
        })
        .catch(err => {
          console.error(err);
          if (downloadErrorCount < 5) {
            console.log('error encountered on download attempt, resuming after 120 seconds');
            downloadErrorCount++;
            setTimeout(() => {
              console.log('attempting to resume');
              next();
            }, 120000);
          } else {
            // mark job as error and continue.
            const jobError = {
              id: jobId,
              in_progress: false,
              stage: 'DOWNLOAD ERROR'
            }
            database.updateJob(jobError)
              .then(result => {
                next();
              })
          }
        })
    }, () => {
      return (latestInstagramUsers > 0 && currentURL);
    }, err => {
      if (downloadErrorCount < 5) {
        const jobUpdate = {
          id: jobId,
          stage: 'Downloaded'
        }
        database.updateJob(jobUpdate)
          .then(result => {
            console.log('list downloaded, job updated');
            console.log('total users processed:', processedUserCount);
            const timeComplete = Date.now();
            const duration = (timeComplete - timeStart) / 1000;
            console.log('time taken (sec):', duration);
            resolve({ count: processedUserCount, duration: duration });
          })
      } else {
        reject('DOWNLOAD ERROR');
      }
    });
  })
}


// allow this to be resumed on fail
TFBridge.prototype.downloadProspectsLEGACY = function (url, jobId) {
  console.log('starting download of prospects');
  const perPage = 1000;
  var processUserCount = 0;
  var downloadErrorCount = 0;
  const timeStart = Date.now();
  var userDebug = [];
  //skip_medias=true&skip_counts=true&filters[unrefreshed]=true&per_page=1
  var options = {
    url: url + '&skip_medias=true&per_page=' + perPage + '&page=1',
    method: 'GET'
  };
  // console.log(options.url);
  var counter = 1;
  var processedCount = 0;
  return new Promise((resolve, reject) => {
    request(options, (err, res, bod) => {
      if (err) {
        console.error(err);
      } else {
        const bodyObj = JSON.parse(bod);
        var pageTracker = new Array(bodyObj.meta.total_pages);
        var scrollId = bodyObj.meta.scroll_id;
  
        for (let i = 0; i < pageTracker - 1; i++) {
          pageTracker[i] = i + 2;
        }

        processedCount += bodyObj.instagram_users.length;

        console.log('creatd page tracker of length:', pageTracker.length);
        async.mapSeries(pageTracker, (page, next) => {
          //load, confirm,
          var currOption = {
            url: url + '&skip_medias=true&per_page=' + perPage + '&scroll_id=' + scrollId,
            method: 'GET'
          }
          console.log('trying:', currOption.url);
          getRequest(currOption)
            .then(result => {
              counter++;
              console.log('current page:', counter);
              // console.log(result.meta);
              scrollId = result.meta.scroll_id;
              processedCount += result.instagram_users.length;
              console.log('number of results received:', result.instagram_users.length);
              console.log('total processed:', processedCount);
              // next();
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
              console.log(result.instagram_users[0]);
            })
            .catch(err => {
              console.error(err);
              if (downloadErrorCount < 5) {
                console.log('error encountered on download attempt, resuming after 120 seconds');
                downloadErrorCount++;
                setTimeout(() => {
                  console.log('attempting to resume');
                  next();
                }, 120000);
              } else {
                // mark job as error and continue.
                const jobError = {
                  id: jobId,
                  in_progress: false,
                  stage: 'DOWNLOAD ERROR'
                }
                database.updateJob(jobError)
                  .then(result => {
                    next();
                  })
              }
            })
        }, err => {
          if (downloadErrorCount < 5) {
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
          } else {
            reject('DOWNLOAD ERROR');
          }
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
      if (err) {
        reject(err);
      } else {
        try {
          const parsed = JSON.parse(res.body);
          resolve(parsed);
        }
        catch (error) {
          const parsed = JSON.parse(bod);
          resolve(parsed);
        }
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

const async = require('async');
const Ig = require('./ig');
const ig = new Ig();
const Database = require('./database').Database;
const database = new Database();
const Scraper = require('./scraper');
const ScrapeSave = require('./scrape-save');
const scrapeSave = new ScrapeSave();
const store = require('../client/store');
const FileHandler = require('./file-controller.js');
const fileHandler = new FileHandler();
const currentSession = { initialized: false, session: {} };
const bullshit = require('./bullshit');
const tfScore = require('./tf-score');
const InfluencerFilter = require('./influencer-filter');
const request = require('request');

// look to change this so that we can re-use the same cookie until expiration
ig.initialize()
  .then(result => {
    console.log('initializing session');
    // console.log('session:', result);
    currentSession.session = result;
  });

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

function Prospect() {

}

// Prospect.prototype.processJob = jobId => {
//   const timeStart = Date.now();
//   console.log('initializing job for id:', jobId);
//   database.getJobByJobId(jobId)
//     .then(job => {
//       console.log(job);
//     })
// }

Prospect.prototype.batchLikers = function (username, jobId, maxPostCount = 2000) {
  const timeStart = Date.now();
  console.log('Getting all likers for', username);
  return new Promise((resolve, reject) => {
    scrapeSave.scrapeSave(username, true)
      .then(user => {
        this.getAllLikers(user.external_id, user.post_count, timeStart, jobId, maxPostCount)
          .then(likers => {
            const timeComplete = Date.now();
            console.log('time taken (sec):', (timeComplete - timeStart) / 1000);
            resolve(likers);
          })
        // resolve(user);
      })
  })
}

Prospect.prototype.downloadProspects = function (listUrl, token, batchId) {
  
}

Prospect.prototype.getFollowers = function (userId) {
  console.log('getting followers');
  return new Promise((resolve, reject) => {
    ig.getFollowers(userId, currentSession.session)
      .then(result => {
        resolve(result);
      })
  })
}

Prospect.prototype.deepLookup = function (username) {
  return new Promise((resolve, reject) => {
    ig.getUser(username, currentSession.session)
      .then(result => {
        console.log(result);
        resolve(result);
      })
  })
}

var totalLikersProcessed = 0;
// will result in array of [username, external_id]
Prospect.prototype.getAllLikers = function (externalId, postCount, timeStart, jobId, maxPostCount = 2000) {
  const errorThreshold = 10;
  var likers = [];
  console.log('Getting all likers for', externalId);
  var counter = 0;
  var mediaCounter = 0;
  var errorCounter = 0;
  totalLikersProcessed = 0;
  return new Promise((resolve, reject) => {
    ig.initializeMediaFeed(externalId, currentSession.session) //, reqProxy.getProxy('http')
      .then(feed => {
        function retrieve() {
          feed.get()
            .then(medias => {
              mediaCounter++;
              async.mapSeries(medias, (media, next) => {
                getMediaLikers(media, likers) //, reqProxy.getProxy('http')
                  .then(newLikers => {
                    saveLikersToProspects(newLikers, jobId)
                      .then(saveResult => {
                        console.log('return from saving prospects:', saveResult);
                        counter++;
                        totalLikersProcessed += newLikers.length
                        likers = likers.concat(...newLikers);
                        var timeNow = Date.now();
                        var timeElapsed = (timeNow - timeStart) / 1000;
                        var predictedTotal = (timeElapsed * postCount) / counter;
                        console.log('\033c');
                        console.log('got new likers, unique total (processed): ' + likers.length + ' (' + totalLikersProcessed + ')');
                        console.log(counter + ' out of ' + postCount + ' posts analyzed. ' + 
                          ((counter / postCount) * 100).toFixed(2) + '%');
                        console.log('time elapsed (sec):', timeElapsed.toFixed(2));
                        console.log('predicted total job duration (sec):', predictedTotal.toFixed(0));
                        console.log('predicted time remaining (sec):', (predictedTotal - timeElapsed).toFixed(0));
                        console.log('errors encountered:', errorCounter);
                        setTimeout(() => {
                          next();
                        }, 1000)
                      })
                    
                  })
                  .catch(err => {
                    console.log('error detected, waiting to restart');
                    setTimeout(() => {
                      console.log('attempting reset');
                      errorCounter++;
                      next();
                    }, 120000)
                  })
              }, err => { // when medias are done, check to see if more medias exist
                if (feed.moreAvailable && errorCounter < errorThreshold && counter < maxPostCount) {
                  console.log('More medias available');

                  setTimeout(() => {
                    retrieve();
                  }, 5000);

                } else if (errorCounter >= errorThreshold) {
                  console.log('too many errors encountered');
                  database.updateJobStage(jobId, 'Primed')
                    .then(result => {
                      // resolve(result[0]);
                      resolve(likers);
                    })
                } else {
                  console.log('All likers retrieved');
                  database.updateJobStage(jobId, 'Primed')
                    .then(result => {
                      // resolve(result[0]);
                      resolve(likers);
                    })
                }
              })
            })
            .catch(err => {
              console.error('error on getting new medias:', err);
              setTimeout(() => {
                retrieve();
              }, 120000)
            })
        } 
        retrieve();
      })
      .catch(err => {
        console.log('feed error');
        console.error(err);
      })
  })
}

// new method for use with tfbridge
Prospect.prototype.getProspects = function (jobId, params, returnAmount = 250) {
  const currentFilter = new InfluencerFilter(params);
  console.log('jobId:', jobId);
  return new Promise((resolve, reject) => {
    database.getUsersByJobId(jobId, params.follower_count.min)
      .then(users => {
        console.log(users.length);
        // resolve(users.length);
        filterCandidates(users, currentFilter)
          .then(candidates => {
            console.log(candidates.length, 'candidates found');
            var prospects = [];
            var matchCandidates = candidates.filter(candidate => {
              return candidate.termMatch > 0;
            });
            var unmatchCandidates = candidates.filter(candidate => {
              return candidate.termMatch == 0;
            })

            // if there are more than 300, sort by score and take top 300
            if (matchCandidates.length > returnAmount) {
              prospects = sortByScore(matchCandidates).slice(0, returnAmount);
            } else {
              prospects = prospects.concat(...sortByScore(matchCandidates));
              prospects = prospects.concat(...sortByScore(unmatchCandidates).slice(0, returnAmount - prospects.length - 1));
            }
            prospects = prospects.map(prospect => { return [prospect.external_id, prospect.username, prospect.score, prospect.termMatch]; });
            // else take them all then sort the remaining list
            // take enough to fill out 300
            // send to TF
            convertAndSave(prospects, ['external_id', 'username', 'score', 'terms'], 'prospects for jobId ' + jobId);
            resolve('sent');
          })
      })
  })
}

Prospect.prototype.likers = function (username, params, targetCandidateAmount = 300, returnCount = 100) { // can be broken into 5 functions
  // var targetCandidateAmount = 200;
  console.log('Getting likers for', username);
  const currentFilter = new InfluencerFilter(params);
  var arrLikers = [];
  const publicLikerIds = [];
  var publicLikerNames = [];
  var arrCandidates = [];
  var counter = 0;
  scrapeSave.scrapeSave(username, true)
    .then(scraped => { // Get data of target account
      console.log('primary user scrape:', scraped);
      ig.initializeMediaFeed(scraped.external_id, currentSession.session) // opening media feed
        .then(feed => {
          function retrieve() {
            feed.get()
              .then(medias => {
                async.mapSeries(medias, (media, next) => {
                  getCandidates(media, currentFilter, arrCandidates)
                    .then(candidates => {
                      arrCandidates = arrCandidates.concat(...candidates);
                      console.log('candidate list length:', arrCandidates.length);
                      next();
                    })
                }, err => {
                  if (feed.moreAvailable && arrCandidates.length < targetCandidateAmount) {
                    console.log('candidate list length:', arrCandidates.length);
                    setTimeout(() => {
                      retrieve(); // recursion here. 
                    }, 1200);
                  } else {
                    console.log('finished');
                    console.log(arrCandidates);
                    // narrow down to 300, send off to TF
                    // create two lists by matchcount (treat as binary)
                    var prospects = [];
                    var matchCandidates = arrCandidates.filter(candidate => {
                      return candidate.termMatch > 0;
                    });
                    var unmatchCandidates = arrCandidates.filter(candidate => {
                      return candidate.termMatch == 0;
                    })

                    // if there are more than 300, sort by score and take top 300
                    if (matchCandidates.length > returnCount) {
                      prospects = sortByScore(matchCandidates).slice(0, returnCount);
                    } else {
                      prospects = prospects.concat(...sortByScore(matchCandidates));
                      prospects = prospects.concat(...sortByScore(unmatchCandidates).slice(0, returnCount - prospects.length -1));
                    }
                    prospects.map(prospect => { console.log(prospect.username, prospect.score, prospect.termMatch); });
                    // else take them all then sort the remaining list
                    // take enough to fill out 300
                    // send to TF
                    convertAndSend(prospects, ['external_id', 'username', 'score'], params.upload_url);
                  }
                })
              })
          }
          retrieve();
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
  // fileHandler.saveCSV(csvFile, 'aaaa output');
}

const convertAndSave = (array, header, name = 'aaaa prospect output') => {
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
  fileHandler.saveCSV(csvFile, name);
}

const saveLikersToProspects = (likers, jobId) => {
  console.log('attempgint save:', likers.length);
  // const splicedLikers = spliceDuplicates(likers);
  // console.log('after dupe splice:', splicedLikers.length);
  return new Promise((resolve, reject) => {
    async.mapSeries(likers, (liker, next) => {
      const newProspect = {
        username: liker.username,
        external_id: liker.id,
        prospect_job_id: jobId,
        relationship_type: 'liker'
      }
      database.upsertProspect(newProspect)
        .then(result => {
          // result contains internal id of prospect.
          next();
        })
    }, err => {
      // update job to a new stage
      resolve(likers.length);
    })
  })
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
}

const sortByScore = candidates => {
  return candidates.sort((a, b) => {
    return b.score - a.score;
  })
}

const getMediaLikers = (media, arrLikers, proxyUrl) => {
  return new Promise((resolve, reject) => {
    ig.getLikers(media, currentSession.session, proxyUrl)
      .then(likers => {
        totalLikersProcessed += likers.length;
        const likerUsernames = arrLikers.map(liker => { return liker.username });
        const publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
        const dedupedPublicLikers = publicLikers.filter(liker => { return likerUsernames.indexOf(liker.username) == -1; });
        resolve(dedupedPublicLikers);
      })
      .catch(err => {
        console.log('get media likers error');
        reject('getMediaLikers failure');
      })
  })
}

// will get likers of a specified media
// list of candidates provided to prevent duplicate scraping
// LEGACY
// const getCandidates = (media, filter, candidates) => {
//   console.log('getting likers for post');
//   return new Promise((resolve, reject) => {
//     ig.getLikers(media, currentSession.session)
//       .then(likers => {
//         var candidateNames = candidates.map(candidate => { return candidate.username });

//         // First remove private likers and then remove any pre-existing.
//         var publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
//         var dedupedPublicLikers = publicLikers.filter(liker => { return candidateNames.indexOf(liker.username) == -1; });
//         filterLikers(dedupedPublicLikers, filter)
//           .then(newCandidates => {
//             resolve(newCandidates);
//           });
//       })
//   })
// }

// for use with tfbridge
// const getCandidates = (media, filter, candidates) => {
//   console.log('getting likers for post');
//   return new Promise((resolve, reject) => {
//     ig.getLikers(media, currentSession.session)
//       .then(likers => {
//         var candidateNames = candidates.map(candidate => { return candidate.username });

//         // First remove private likers and then remove any pre-existing.
//         var publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
//         var dedupedPublicLikers = publicLikers.filter(liker => { return candidateNames.indexOf(liker.username) == -1; });
//         filterLikers(dedupedPublicLikers, filter)
//           .then(newCandidates => {
//             resolve(newCandidates);
//           });
//       })
//   })
// }

// scrapes and scores each liker returns list of users with score and match count
// LEGACY VERSION - USE FOR STANDALONE PROSPECTING
// const filterLikers = (likers, filter) => {
//   return new Promise((resolve, reject) => {
//     var candidates = [];
//     async.mapSeries(likers, (liker, next) => {

//       scrapeSave.scrapeSave(liker.username, database)
//         .then(user => {
//           var tempCandidate = verifyCandidate(user, filter);
//           if (tempCandidate.isValid) {
//             console.log('new candidate found');
//             candidates.push(tempCandidate);
//           } // put catch here
//           next();
//         })
//         .catch(err => {
//           console.error(err);
//           next();
//         })

//     }, err => {
//       resolve(candidates);
//     })
//   })
// }

// updated for use with tfbridge
const filterCandidates = (likers, filter) => {
  return new Promise((resolve, reject) => {
    var candidates = [];
    async.mapSeries(likers, (liker, next) => {
      var tempCandidate = verifyCandidate(liker, filter);
      if (tempCandidate.isValid) {
        candidates.push(tempCandidate);
      }
      setTimeout(() => {
        next();
      }, 5);
      // next();
    }, err => {
      resolve(candidates);
    })
  })
}

// Will check freshly scraped liker against params
// Will also assign score and match count
// reject if any misaligned terms
const verifyCandidate = (user, filter) => {
  return filter.score(user);
}

const reqProxy = {
  proxyAddress: '144.208.127.171',
  port: '65233',
  username: 'john',
  password: 'M7g7RqY',
  getProxy: function (mode = 'http') {
    let addressBuilder = (mode == 'https' ? 'https://' : 'http://');
    addressBuilder += this.username + ':' + this.password + '@';
    addressBuilder += this.proxyAddress + ':' + this.port;
    return addressBuilder;
  }
}

module.exports = Prospect
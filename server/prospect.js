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
ig.initialize()
  .then(result => {
    console.log('initializing session');
    currentSession.session = result;
  });

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

function Prospect() {

}

Prospect.prototype.testThousand = function (url) {
  database.getThousand()
    .then(thousand => {
      const thousandValue = thousand.map(row => { return [row.username, row.external_id]; });
      // console.log(thousandValue);

      convertAndSend(thousandValue, ['username', 'external_id'], url);
    })
}

Prospect.prototype.batchLikers = function (username) {
  const timeStart = Date.now();
  console.log('Getting all likers for', username);
  return new Promise((resolve, reject) => {
    scrapeSave.scrapeSave(username, true)
      .then(user => {
        this.getAllLikers(user.external_id, user.post_count, timeStart)
          .then(likers => {
            resolve(likers);
            const timeComplete = Date.now();
            console.log('time taken (sec):', (timeComplete - timeStart) / 1000);
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
Prospect.prototype.getAllLikers = function (externalId, postCount, timeStart) {
  var likers = [];
  console.log('Getting all likers for', externalId);
  var counter = 0;
  totalLikersProcessed = 0;
  return new Promise((resolve, reject) => {
    ig.initializeMediaFeed(externalId, currentSession.session)
      .then(feed => {
        function retrieve() {
          feed.get()
            .then(medias => {
              async.mapSeries(medias, (media, next) => {
                getMediaLikers(media, likers)
                  .then(newLikers => {
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

                    setTimeout(() => {
                      next();
                    }, 1000)
                  })
                  .catch(err => {
                    console.log('error detected, waiting to restart');
                    setTimeout(() => {
                      console.log('attempting reset');
                      next();
                    }, 120000)
                  })
              }, err => { // when medias are done, check to see if more medias exist
                if (feed.moreAvailable) {
                  console.log('More likers available');
                  setTimeout(() => {
                    retrieve();
                  }, 1000);
                } else {
                  console.log('All likers retrieved');
                  resolve(likers);
                }
              })
            })
        } 
        retrieve();
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
                      // if (arrCandidates.length >= targetCandidateAmount) {
                      //   console.log('size met, skipping');
                      //   next();
                      // }
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
// app.post('/prospect', (req, res) => {
// })
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
}

const sortByScore = candidates => {
  return candidates.sort((a, b) => {
    return b.score - a.score;
  })
}

const getMediaLikers = (media, arrLikers) => {
  return new Promise((resolve, reject) => {
    ig.getLikers(media, currentSession.session)
      .then(likers => {
        totalLikersProcessed += likers.length;
        const likerUsernames = arrLikers.map(liker => { return liker.username });
        const publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
        const dedupedPublicLikers = publicLikers.filter(liker => { return likerUsernames.indexOf(liker.username) == -1; });
        resolve(dedupedPublicLikers);
      })
  })
}

// will get likers of a specified media
// list of candidates provided to prevent duplicate scraping
const getCandidates = (media, filter, candidates) => {
  console.log('getting likers for post');
  return new Promise((resolve, reject) => {
    ig.getLikers(media, currentSession.session)
      .then(likers => {
        var candidateNames = candidates.map(candidate => { return candidate.username });

        // First remove private likers and then remove any pre-existing.
        var publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
        var dedupedPublicLikers = publicLikers.filter(liker => { return candidateNames.indexOf(liker.username) == -1; });
        filterLikers(dedupedPublicLikers, filter)
          .then(newCandidates => {
            resolve(newCandidates);
          });
      })
  })
}

// scrapes and scores each liker returns list of users with score and match count
const filterLikers = (likers, filter) => {
  return new Promise((resolve, reject) => {
    var candidates = [];
    async.mapSeries(likers, (liker, next) => {
      // scrape details here
      if (liker.username != 'avinash_patil_23') {
        scrapeSave.scrapeSave(liker.username, database)
          .then(user => {
            var tempCandidate = verifyCandidate(user, filter);
            if (tempCandidate.isValid) {
              console.log('new candidate found');
              candidates.push(tempCandidate);
            } // put catch here
            next();
          })
          .catch(err => {
            console.error(err);
            next();
          })
      } else {
        next();
      }
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



module.exports = Prospect
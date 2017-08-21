const async = require('async');
const Ig = require('./ig');
const ig = new Ig();
const Database = require('./database').Database;
const database = new Database();
const Scraper = require('./scraper');
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

Prospect.prototype.likers = function (username, params) { // can be broken into 5 functions
  var targetCandidateAmount = 50;

  console.log('Getting likers for', username);
  const currentFilter = new InfluencerFilter(params);
  var arrLikers = [];
  const publicLikerIds = [];
  var publicLikerNames = [];
  var arrCandidates = [];
  var counter = 0;
  scrapeSave(username, true)
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
                    if (matchCandidates.length > 300) {
                      prospects = sortByScore(matchCandidates).slice(0, 299);
                    } else {
                      prospects = prospects.concat(...sortByScore(matchCandidates));
                      prospects = prospects.concat(...sortByScore(unmatchCandidates).slice(0, 300 - prospects.length -1));
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
  const filteredProspects = array.map(elem => {
    return [elem.external_id, elem.username, elem.score];
  });
  var rows = [
    ['external_id', 'username', 'score'],
    ...filteredProspects
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
}

const sortByScore = candidates => {
  return candidates.sort((a, b) => {
    return b.score - a.score;
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
        scrapeSave(liker.username)
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
  // console.log('verifyCandidate, youngest post', user.youngest_post);
  return filter.score(user);
}

const scrapeSave = (username, bypass=false) => { // now with more resume-ability!
  console.log('scraping', username);
  var thisId;
  return new Promise((resolve, reject) => {
    database.getUserByUsername(username)
      .then(user => {
        if (!user || bypass || user.recent_like_count == 0 || user.recent_like_count == null) {
          Scraper(username)
            .then(user => {
              // console.log('scraper, youngest post', user.youngest_post);
              var tempUser = Object.assign({}, user);
              delete tempUser.youngest_post;
              database.upsertUser(tempUser)
                .then(result => {
                  database.getEIdFromExternalId(user.external_id, 'users')
                    .then(id => {
                      resolve(user);
                    })
                })
                .catch(err => {
                  console.log('upsert attemp failure');
                  reject(err);
                })
            })
            .catch(err => {
              console.log('scraper failure');
              reject(err);
            })
        } else {
          console.log('skipping');
          resolve(user);
        }
      })
    .catch(err => {
      console.log('get user by username failure');
      reject(err);
    })
  });
}

module.exports = Prospect
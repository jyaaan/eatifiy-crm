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

// const dispatchClient = data => {
//   fetch('/dispatch', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data)
//   })
// }

// how we retrieve medias
// function retrieve() {
//   feed.get()
//     .then(result => {
//       result.map(media => {
//         console.log('deviceTimestamp:', media._params.deviceTimestamp);
//         const timeStamp = media._params.deviceTimestamp;
//         var postDate = timeStamp > 1500000000 ? new Date(timeStamp) : new Date(timeStamp * 1000);
//         console.log('converted date:', postDate.formatMMDDYYYY());
//         if (postDate > dateRange || postDate < errorDate) {
//           medias.push(media._params);
//         } else {
//           console.log('date out of range');
//           validDate = false;
//         }
//       });
//       if (feed.moreAvailable && validDate) {
        // setTimeout(() => {
        //   retrieve(); // recursion here. 
        // }, 1200);
//       } else {
//         resolve(medias);
//       }
//     });
// };
// retrieve();

Prospect.prototype.likers = function (username, params) { // can be broken into 5 functions
  var targetCandidateAmount = 900;

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
}
const signal = (csvFile, url) => {
  //http://localhost:3000/users/sourtoe/prospects/14.csv?token=7qgU9Qha8KzuKZVv2Pj8pzd7
  // 'http://192.241.192.44:5760/test-url'
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
      scrapeSave(liker.username)
        .then(user => {
          var tempCandidate = verifyCandidate(user, filter);
          if (tempCandidate.isValid) {
            console.log('new candidate found');
            candidates.push(tempCandidate);
          }
          next();
        })
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

// Previous incarnation suited for YF UI.
// Prospect.prototype.likers = function (params, filterParams) { // can be broken into 5 functions
//   const { username, days, mediaLimit } = params;
//   console.log('likers:', username, days, mediaLimit);
//   const lookback = days > 0 ? days : 30;

//   var arrLikers = [];
//   const publicLikerIds = [];
//   var publicLikerNames = [];
//   var counter = 0;
//   // initializing
//   store.dispatch({
//     type: 'GLOBAL_DISPATCH',
//     dispatch: {
//       type: 'CHANGE_STAGE',
//       stage: 'medias'
//     }
//   });
//   // dispatchClient({
//   //   type: 'CHANGE_STAGE',
//   //   stage: 'medias'
//   // })
//   scrapeSave(username, true)
//     .then(scraped => {
//       // start medias gathering
//       console.log('trying to dispatch');
//       // store.dispatch({
//       //   type: 'CHANGE_STAGE',
//       //   stage: 'medias'
//       // });
//       console.log(scraped);
//       ig.getMedias(scraped.external_id, currentSession.session, lookback)
//         .then(medias => {
//           console.log('medias count:', medias.length);
//           let mediaCounter = 0;
//           // store.dispatch({
//           //   type: 'UPDATE_STATUS',
//           //   status: {
//           //     progress: 0,
//           //     total: medias.length
//           //   }
//           // });
//           // store.dispatch({
//           //   type: 'CHANGE_STAGE',
//           //   stage: 'likers'
//           // });
//           async.mapSeries(medias, (media, next) => {
//             mediaCounter++;
//             // gathering likers for mediaCounter of medias.length posts
//             // store.dispatch({
//             //   type: 'UPDATE_STATUS',
//             //   status: {
//             //     progress: mediaCounter
//             //   }
//             // });
//             ig.getLikers(media, currentSession.session)
//               .then(likers => {
//                 arrLikers = arrLikers.concat(...likers);
//                 setTimeout(() => {
//                   next();
//                 }, 1000)
//               })
//               .catch(err => {
//                 setTimeout(() => {
//                   next();
//                 })
//               })
//           }, err => {
//             console.log('likers count:', arrLikers.length);

//             var likerNames = arrLikers.map(liker => { return liker.username; });
//             var dedupedLikers = spliceDuplicates(likerNames);
//             console.log('after dedupe:', dedupedLikers.length);

//             var publicLikers = arrLikers.filter(liker => { return liker.isPrivate == false; });
//             publicLikerNames = publicLikers.map(liker => { return liker.username; });
//             const dedupedPublicLikers = spliceDuplicates(publicLikerNames); // this will be useful for monitoring progress
//             console.log('deduped public only:', dedupedPublicLikers.length);
//             // store.dispatch({
//             //   type: 'UPDATE_STATUS',
//             //   status: {
//             //     progress: 0,
//             //     total: dedupedPublicLikers.length
//             //   }
//             // });
//             // store.dispatch({
//             //   type: 'CHANGE_STAGE',
//             //   stage: 'users'
//             // });
//             async.mapSeries(dedupedPublicLikers, (liker, followup) => {
//               counter++;
//               console.log((counter / dedupedPublicLikers.length * 100).toFixed(2));
//               // store.dispatch({
//               //   type: 'UPDATE_STATUS',
//               //   status: {
//               //     progress: counter
//               //   }
//               // });
//               scrapeSave(liker)
//                 .then(user => {
//                   publicLikerIds.push(user.id);
//                   followup();
//                 })
//                 .catch(err => { // light-weight error handling. not very effective. read up on try/catch and implement further upstream
//                   console.log('error detected, trying again...');
//                   console.error(err);
//                   scrapeSave(liker)
//                     .then(likerIds => {
//                       console.log('second attempt successful');
//                       publicLikerIds.push(likerIds.id);
//                       followup();
//                     })
//                     .catch(err => {
//                       console.log('second error, continuing');
//                       followup();
//                     })
//                 })
//             }, err => {
//               // filtering users for influencers
//               // store.dispatch({
//               //   type: 'CHANGE_STAGE',
//               //   stage: 'filter'
//               // });
//               database.getInfluencers(publicLikerIds, filterParams)
//                 .then(influencers => {
//                   const headers = ['id', 'externalId', 'username', 'postCount', 'TFScore', 'bullshitScore', 'followerCount', 'followingCount', 'following/follower ratio', 'recentPostCount', 'recentAvLikes', 'recentAvComments', 'likeRatio', 'commentRatio', 'postFrequency(Hr)', 'likesCount', 'website'];
//                   var influencerData = influencers.map(influencer => { // refactor this mess
//                     return influencer.id + ',' + influencer.external_id + ',' + influencer.username + ',' + influencer.post_count + ',' +
//                       tfScore(influencer, { followers: 'hi', posts: 'hello' }) + ',' + bullshit(influencer) + ',' +
//                       influencer.follower_count + ',' +
//                       influencer.following_count + ',' + (influencer.following_count / influencer.follower_count) + ',' + influencer.recent_post_count + ',' + (influencer.recent_like_count / influencer.recent_post_count) + ',' +
//                       (influencer.recent_comment_count / influencer.recent_post_count) + ',' + ((influencer.recent_like_count) / influencer.recent_post_count) / influencer.follower_count + ',' +
//                       (influencer.recent_comment_count / influencer.recent_post_count) / influencer.follower_count + ',' + ((influencer.recent_post_duration / 3600) / influencer.recent_post_count) + ',' +
//                       publicLikerNames.filter(likerName => { return likerName == influencer.username; }).length + ',' + influencer.external_url;
//                   });
//                   // writing to file
//                   store.dispatch({
//                     type: 'CHANGE_STAGE',
//                     stage: 'write'
//                   });
//                   fileHandler.writeToCSV(influencerData, username + '-influencer-data', headers)
//                     .then(result => {
//                       // database.getConsumers(publicLikerIds)
//                       //   .then(consumers => {
//                       //     var consumerData = consumers.map(consumer => {
//                       //       return consumer.id +',' + consumer.external_id + ',' + consumer.username + ',' + consumer.follower_count + ',' + 
//                       //       consumer.following_count + ',' + (consumer.following_count / consumer.follower_count) + ',' + 
//                       //       consumer.recent_post_count + ',' + consumer.recent_like_count + ',' + consumer.recent_comment_count + ',' + ((consumer.recent_post_duration / 3600) / consumer.recent_post_count) + ',' +
//                       //       publicLikerNames.filter(likerName => { return likerName == consumer.username; }).length + ',' + consumer.external_url;
//                       //     })
//                       //     fileHandler.writeToCSV(consumerData, username + '-consumer-data', headers);
//                       //   })
//                       // complete!!
//                     })
//                 })
//                 .catch(err => {
//                   console.log('getInfluencers failure');
//                   console.error(err);
//                 })
//             });
//           })
//         });
//     })
//     .catch(err => {
//       console.error(err);
//     });
// }
// const scrapeSave = (username, bypass = false) => { // now with more resume-ability!
//   console.log('scraping', username);
//   var thisId;
//   return new Promise((resolve, reject) => {
//     database.getUserByUsername(username)
//       .then(user => {
//         // console.log('user:', user);
//         if (!user || bypass || user.recent_like_count == 0 || user.recent_like_count == null) {
//           Scraper(username)
//             .then(user => {
//               database.upsertUser(user)
//                 .then(result => {
//                   database.getEIdFromExternalId(user.external_id, 'users')
//                     .then(id => {
//                       resolve({ id: id[0].id, external_id: user.external_id });
//                     })
//                 })
//                 .catch(err => {
//                   console.log('upsert attemp failure');
//                   reject(err);
//                 })
//             })
//             .catch(err => {
//               console.log('scraper failure');
//               reject(err);
//             })
//         } else {
//           console.log('skipping');
//           resolve({ id: user.id, external_id: user.external_id });
//         }
//       })
//       .catch(err => {
//         console.log('get user by username failure');
//         reject(err);
//       })
//   });
// }
module.exports = Prospect
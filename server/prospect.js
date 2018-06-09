const async = require('async');
// const Ig = require('./ig');
// const ig = new Ig();
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

// const ProxyManager = require('./proxy_manager');
// const proxyManager = new ProxyManager();
const thisProxyObj = {
  proxyAddress: "191.96.50.194",
  port: "65233",
  username: "johnyamashiro",
  password: "B4h2KrO",
  ig_username: "eatifyjohn",
  ig_password: "occsbootcamp",
  expiration_date: "4/21/2018"
}
const Proxy = require('./proxy');
const proxy = new Proxy(thisProxyObj)
var activeIG = {};
setTimeout(() => {
  // console.log('proxy manager:', proxyManager.proxies[0]);
  // console.log('session:', proxyManager.proxies[0].session);
  // console.log('performance history:', proxyManager.proxies[0].performanceHistory);
  activeIG = proxy.ig;
}, 10000);

// const loadActiveIG = () => {
//   const nextProxy = proxyManager.getNextProxy();
//   console.log('nextProxy:', nextProxy.ig_username);
//   nextProxy.performanceHistory.usageCount++;
//   activeIG = nextProxy.ig;
// }


// const reqProxy = {
//   proxyAddress: '146.71.87.105',
//   port: '65233',
//   username: 'johnyamashiro',
//   password: 'B4h2KrO',
//   getProxy: function (mode = 'http') {
//     let addressBuilder = (mode == 'https' ? 'https://' : 'http://');
//     addressBuilder += this.username + ':' + this.password + '@';
//     addressBuilder += this.proxyAddress + ':' + this.port;
//     return addressBuilder;
//   }
// }

// look to change this so that we can re-use the same cookie until expiration
// ig.initialize('JakeDMachina', 'occsbootcamp', reqProxy.getProxy('http'))
//   .then(result => {
//     console.log('initializing session');
//     // console.log('session:', result);
//     currentSession.session = result;
//   });

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

function Prospect() {

}

Prospect.prototype.batchLikers = function (username, jobId, maxPostCount = 2000, maxLikerCount = 30000) {
  const timeStart = Date.now();
  console.log('Getting all likers for', username);
  // loadActiveIG();
  return new Promise((resolve, reject) => {
    this.getUser(username)
      .then(user => {
        this.getAllLikers(user.id, timeStart, jobId, maxPostCount, activeIG, maxLikerCount)
          .then(likers => {
            const timeComplete = Date.now();
            console.log('time taken (sec):', (timeComplete - timeStart) / 1000);
            resolve(likers);
          })
      })
  })
}

Prospect.prototype.getJobMembers = function(jobId) {

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

Prospect.prototype.createPost = function (filePath, caption, proxyManager) {
  return proxyManager.tfProxy.ig.createPost(filePath, caption)
}

Prospect.prototype.sendMessage = function (externalId, message) {
  proxyManager.tfProxy.ig.sendMessage(externalId, message)
    .then(result => {
      console.log(result);
    })
}

Prospect.prototype.checkInbox = function () {
  
}
/*
{ username: 'truefluence',
  picture: 'https://scontent-atl3-1.cdninstagram.com/vp/7fc91e4e095b7764b5f8a3bb30cb066a/5B3F4CBF/t51.2885-19/s150x150/18299931_1176211512508631_1514144553601335296_a.jpg',
  fullName: '',
  id: 5436898817,
  isPrivate: false,
  hasAnonymousProfilePicture: false,
  isBusiness: false,
  profilePicId: '1510539073855659110_5436898817',
  byLine: '65 followers',
  followerCount: 65,
  mutualFollowersCount: 0 }
*/
Prospect.prototype.getUser = function(username) {
  // loadActiveIG();
  return new Promise((resolve, reject) => {
    activeIG.getUser(username)
      .then(user => {
        // console.log(user);
        resolve(user[0]._params);
      })
      .catch(err => {
        reject(err);
      })
  })
}

Prospect.prototype.getRecentMedia = function(username) {
  // loadActiveIG();
  return new Promise((resolve, reject) => {
    activeIG.getUser(username)
      .then(user => {
        activeIG.initializeMediaFeed(user[0]._params.id)
          .then(feed => {
            function retrieve() {
              feed.get()
                .then(medias => {
                  resolve(medias.map(media => { return parseMedia(media) }));
                })
            }
            retrieve();
          })
      })
  })
}

Prospect.prototype.getMedia = function(externalId) {
  // loadActiveIG();
  console.log('getting media for: ', externalId)
  return new Promise((resolve, reject) => {
    activeIG.initializeMediaFeed(externalId)
      .then(feed => {
        console.log('initialization successful');
        function retrieve() {
          feed.get()
            .then(medias => {
              if (medias.length > 0) {
                console.log('medias found');
                resolve(medias.map(media => { return parseMedia(media) }));
              } else {
                resolve([]);
              }
            })
            .catch(err => {
              console.log('getMedia feed error');
              reject(err);
            });
        }
        retrieve();
        })
      .catch(err => {
        console.log('getMedia initialization failure');
        reject(err);
      })
  })
}

const parseMedia = media => {
  // console.log(media._params);
  // console.log(media._params.images);
  const imageLink = media._params.images[0].url ? media._params.images[0].url : media._params.images[0][0].url
  var imageURL = imageLink.indexOf('?') > -1 ? imageLink.substr(0, imageLink.indexOf('?')) : imageLink;
  const thumbLink = media._params.images[1].url ? media._params.images[1].url : media._params.images[0][1].url
  var thumbURL = thumbLink.indexOf('?') > -1 ? thumbLink.substr(0, thumbLink.indexOf('?')) : thumbLink;
  var photoUsernames = [];
  var photoExternalIds = [];
  if (media._params.usertags) {
    media._params.usertags.in.forEach(user => { photoUsernames.push(user.user.username) });
    media._params.usertags.in.forEach(user => { photoExternalIds.push(String(user.user.pk)) });
    photoUsernames = photoUsernames.toString();
    photoExternalIds = photoExternalIds.toString();
  } else {
    photoUsernames = null;
    photoExternalIds = null;
  }
  return {
    posted_at: new Date(media._params.takenAt),
    external_id: String(media._params.id),
    user_external_id: String(media.account._params.id),
    image_low: imageURL,
    image_standard: imageURL,
    image_thumbnail: thumbURL,
    caption: media._params.caption ? media._params.caption.replace(/'/g, '') : '',
    link: media._params.webLink,
    like_count: media._params.likeCount,
    comment_count: media._params.commentCount,
    type: media._params.mediaType = 1 ? 'image' : media._params.mediaType = 2 ? 'video' : 'carousel',
    filter_type: media._params.filterType ? media._params.filterType : null,
    photo_usernames: photoUsernames,
    photo_external_user_ids: photoExternalIds,
    latitude: media.location ? media.location._params.lat : null,
    longitude: media.location ? media.location._params.lng : null,
  }
}

Prospect.prototype.getPostLikers = function (media) {
  // loadActiveIG();
  const thisActiveIG = activeIG;
  return new Promise((resolve, reject) => {
    thisActiveIG.initializeMediaFeed('5436898817')
      .then(feed => {
        getAllMediaLikers(media, thisActiveIG)
          .then(likers => {
            // save them likers as prospects
            // console.log('public count: ', likerObj.public.length);
            // console.log('private count: ', likerObj.private.length);
            // console.log(likerObj);
            resolve(likers);
          })
          .catch(err => {
            reject(err);
          })
      })
  })
}

var totalLikersProcessed = 0;
// will result in array of [username, external_id]
Prospect.prototype.getAllLikers = function (externalId, timeStart, jobId, maxPostCount = 2000, igSession, maxLikerCount) {
  const errorThreshold = 10;
  var likers = [];
  // console.log('Getting all likers for', externalId);
  var counter = 0;
  var mediaCounter = 0;
  var errorCounter = 0;
  totalLikersProcessed = 0;
  var publicLikerCount = 0;

  // load active ig here
  // loadActiveIG();
  /*
_params:
   { username: 'deepakyaduvanshi5235',
     picture: 'https://scontent-lax3-1.cdninstagram.com/vp/f2c2510885b279698dc801c413ae9ab4/5B5D020B/t51.2885-19/s150x150/17818160_230643574079114_2368253569833893888_a.jpg',
     fullName: 'Deepak Yaduvanshi',
     id: 4711850234,
     isPrivate: true,
     hasAnonymousProfilePicture: undefined,
     isBusiness: false,
     profilePicId: '1486874706569056270_4711850234' },
  id: 4711850234 }
  */
  return new Promise((resolve, reject) => {
    igSession.initializeMediaFeed(externalId)
      .then(feed => {
        function retrieve() {
          feed.get()
            .then(medias => {
              async.mapSeries(medias, (media, next) => {
                if (publicLikerCount < maxLikerCount) {
                  getMediaLikers(media, likers, igSession)
                  .then(newLikers => {
                      saveLikersToProspects(newLikers, jobId)
                        .then(saveResult => {
                          counter++;
                          console.log('medias processed: ', counter);
                          // totalLikersProcessed += newLikers.length
                          likers = likers.concat(...newLikers);
                          // dedupe and get public liker count.
                          publicLikerCount = likers.filter(liker => { return liker.isPrivate == false; }).length;
                          console.log('public likers: ', publicLikerCount);
                          // var timeNow = Date.now();
                          // var timeElapsed = (timeNow - timeStart) / 1000;
                          // var predictedTotal = (timeElapsed * postCount) / counter;
                          // console.log('\033c');
                          // console.log('got new likers, unique total: ' + likers.length);
                          // console.log('job ' + jobId + ':' + counter);
                          // console.log('time elapsed (sec):', timeElapsed.toFixed(2));
                          // console.log('predicted total job duration (sec):', predictedTotal.toFixed(0));
                          // console.log('predicted time remaining (sec):', (predictedTotal - timeElapsed).toFixed(0));
                          // console.log('errors encountered:', errorCounter);
                          setTimeout(() => {
                            next();
                          }, 1200)
                        })
                        .catch(err => {
                          console.error(err);
                          // next();
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
                } else {
                  console.log('max likers reached, skipping media');
                  next ();
                }
              }, err => { // when medias are done, check to see if more medias exist
                if (feed.moreAvailable && errorCounter < errorThreshold && counter < maxPostCount && publicLikerCount < maxLikerCount) {
                  // console.log('More medias available');

                  setTimeout(() => {
                    retrieve();
                  }, 3000);

                } else if (errorCounter >= errorThreshold) {
                  console.log('too many errors encountered');
                  database.updateJobStage(jobId, 'Awaiting Scrape')
                    .then(result => {
                      // resolve(result[0]);
                      resolve(likers);
                    })
                } else {
                  console.log('All likers retrieved');
                  database.updateJobStage(jobId, 'Awaiting Scrape')
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

Prospect.prototype.getPosts = function (externalId, maxIteration = 20) {
  // loadActiveIG();
  var posts = [];
  var counter = 1;
  return new Promise((resolve, reject) => {
    activeIG.initializeMediaFeed(externalId)
      .then(feed => {
        function retrieve() {
          feed.get()
            .then(medias => {
              if (medias.length > 0) {
                posts = posts.concat(medias);
                if (feed.moreAvailable && counter < maxIteration) {
                  counter++;
                  setTimeout(() => {
                    retrieve();
                  }, 5000);
                } else {
                  resolve(posts);
                }
              }
            })
            .catch(err => {
              reject(err);
            })
        }
        retrieve();
      })
      .catch(err => {
        reject(err);
      })
  })
}

Prospect.prototype.getRecentSCPost = function (externalId) {
  // loadActiveIG();
  console.log('starting getRecentSCPost');
  console.log(activeIG);
  return new Promise((resolve, reject) => {
    activeIG.initializeMediaFeed(externalId)
      .then(feed => {
        console.log('feed:', feed);
        function retrieve() {
          feed.get()
            .then(medias => {
              if (medias.length > 0) {
                const captionedPosts = medias.filter(media => {
                  return media._params.caption;
                })
                if (captionedPosts.length > 0) {
                  var validPosts = captionedPosts.filter(media => {
                    return media._params.caption.indexOf('SC:') > 0;
                  })
                  if (validPosts.length > 0) {
                    const recentPost = validPosts.sort((a, b) => {
                      return b._params.takenAt - a._params.takenAt;
                    })[0];
                    resolve(extractSCFromCaption(recentPost._params.caption))
                  } else {
                    if (feed.moreAvailable){
                      setTimeout(() => {
                        retrieve();
                      }, 5000);
                    } else {
                      resolve(null);
                    }
                  }
                } else {
                  if (feed.moreAvailable) {
                    setTimeout(() => {
                      retrieve();
                    }, 5000);
                  } else {
                    resolve(null);
                  }
                }
              } else {
                resolve(null);
              }
            })
            .catch(err => {
              console.error('error on getting new medias for pusher:', err);
              reject(err);
            })
        }
        retrieve();
      })
      .catch(err => {
        console.log('feed error');
        // console.error(err);
        reject(err);
      })
  })
}

const extractSCFromCaption = caption => {
  const extract = caption.match(new RegExp("SC:(.*)\\n")); // update to go from bottom up
  return extract ? extract[1] : null;
}

// should return a list as well as a 
Prospect.prototype.analyzeEngagement = function (externalId, postCount, timeStart, jobId, targetLikers = 10000) {
  const errorThreshold = 10;
  var likers = [];
  console.log('Getting all likers for', externalId);
  var counter = 0;
  var mediaCounter = 0;
  var errorCounter = 0;
  totalLikersProcessed = 0;
  return new Promise((resolve, reject) => {
    activeIG.initializeMediaFeed(externalId, currentSession.session, reqProxy.getProxy('http'))
      .then(feed => {
        function retrieve() {
          feed.get()
            .then(medias => {
              mediaCounter++;
              async.mapSeries(medias, (media, next) => {
                getMediaLikers(media, likers, reqProxy.getProxy('http'))
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
                      .catch(err => {
                        console.error(err);
                        // next();
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
        // console.log(users.length);
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
      // console.log('primary user scrape:', scraped);
      activeIG.initializeMediaFeed(scraped.external_id, currentSession.session) // opening media feed
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
                    // console.log(arrCandidates);
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

const BatchDB = require('./batch_db');
const batchDB = new BatchDB();

const saveLikersToProspects = (likers, jobId) => {
  // console.log('attempgint save:', likers.length);
  const timeNow = new Date(Date.now()).toISOString();
  // const splicedLikers = spliceDuplicates(likers);
  // console.log('after dupe splice:', splicedLikers.length);
  return new Promise((resolve, reject) => {
    if (likers.length > 0) {
      const formattedLikers = likers.map(liker => {
        return {
          username: liker.username,
          external_id: liker.id,
          prospect_job_id: jobId,
          relationship_type: 'liker',
          created_at: timeNow,
          updated_at: timeNow,
          private: liker.isPrivate
        }
      })
      // console.log('formatted likers:', formattedLikers);
      database.raw(batchDB.upsertProspects(formattedLikers))
        .then(result => {
          resolve(result.length);
        })
        .catch(err => {
          console.error(err);
          reject(err);
        });
    } else {
      resolve(0);
    }
  })
}

const saveLikersToProspectsLEGACY = (likers, jobId) => {
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

const getMediaLikers = (media, arrLikers, igSession) => {
  return new Promise((resolve, reject) => {
    igSession.getLikers(media)
      .then(likers => {
        totalLikersProcessed += likers.length;
        const likerUsernames = arrLikers.map(liker => { return liker.username });
        // const publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
        const dedupedLikers = likers.filter(liker => { return likerUsernames.indexOf(liker.username) == -1; });
        resolve(dedupedLikers);
      })
      .catch(err => {
        console.log('get media likers error');
        reject('getMediaLikers failure');
      })
  })
}

const getAllMediaLikers = (media, igSession) => {
  // console.log('igSession: ', igSession.session);
  return new Promise((resolve, reject) => {
    igSession.getLikers(media)
      .then(likers => {
        // console.log(likers);
        // const privateLikers = likers.filter(liker => { return liker.isPrivate; });
        // const publicLikers = likers.filter(liker => { return liker.isPrivate == false; });
        // resolve({ private: privateLikers, public: publicLikers });
        resolve(likers);
      })
      .catch(err => {
        console.log('get all medialikers error');
        reject(err);
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



module.exports = Prospect
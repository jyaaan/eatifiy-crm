const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');
const Database = require('./database').Database;
const database = new Database();
const ParseScrape = require('./parse-scrape');
const Scraper = require('./scraper');
const ScrapeSave = require('./scrape-save');
const scrapeSave = new ScrapeSave();
const ScraperMedia = require('./scraper-media');
const async = require('async');
const fs = require('fs');
const request = require('request');
const FileHandler = require('./file-controller');
const fileHandler = new FileHandler();
const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };
const Prospect = require('./prospect');
const prospect = new Prospect();

const TFBridge = require('./tf-bridge');
const tfBridge = new TFBridge();

const http = require('http').createServer(app);

app.use(staticMiddleware);
app.use(bodyParser.json());

const listDetails = {
  loaded: false,
  staging: true,
  token: '',
  username: '',
  listId: ''
}

const testListDetails = {
  "loaded": true,
  "staging": true,
  "token": "nnZdA6NCvRNrUp5tjNu4VEUz",
  "username": "lawrencehunt_co",
  "listId": "1195"
}

// const testListDetails = {
//   "loaded": true,
//   "staging": true,
//   "token": "thatboyaintright",
//   "username": "lawrencehunt_co",
//   "listId": "1"
// }

getValue = (url, value, terminus = '/') => {
  if (url.indexOf(value) > 0) {
    const startPos = url.indexOf(value) + value.length;
    const endPos = url.indexOf(terminus, startPos) > 0 ? url.indexOf(terminus, startPos) : url.length;
    return url.substring(startPos, endPos);
  } else {
    return -1;
  }
}

getSubmitURL = listDetails => {
  var submitURL = 'https://' + (listDetails.staging ? 'staging.' : 'app.') + 'truefluence.io/users/';
  submitURL = submitURL + listDetails.username + '/prospects/' + listDetails.listId + '.csv?token=';
  submitURL = submitURL + listDetails.token;
  return submitURL;
}

getDownloadURL = listDetails => {
  var downloadURL = 'https://' + (listDetails.staging ? 'staging.' : 'app.') + 'truefluence.io/users/';
  downloadURL = downloadURL + listDetails.username + '/prospects/' + listDetails.listId + '.json?token=';
  downloadURL = downloadURL + listDetails.token;
  return downloadURL;
}

app.get('/batch-likers-test/:username', (req, res) => {
  res.send('OK');
  prospect.batchLikers(req.params.username)
    .then(likers => {
      console.log('likers found:', likers.length);
    })
})

app.get('/health_ping', (req, res) => {
  res.send('OK'); 
})

app.get('/list-details', (req, res) => {
  console.log('getting list details');
  if (listDetails.loaded) {
    res.send(listDetails.listId);
  } else {
    res.send('-1');
  }
})

app.get('/test-create-job', (req, res) => {
  if (testListDetails.loaded) {
    database.listIdExists(testListDetails.listId)
      .then(exists => {
        if (!exists) {
          console.log('doesn\'t exist, adding');
          const job = {};
          job.prospect_list_id = testListDetails.listId;
          job.token = testListDetails.token;
          job.primary_username = testListDetails.username;
          job.analyzed_username = testListDetails.username;
          job.stage = 'initialized';
          job.filter_params = JSON.stringify({});
    
          database.createJob(job)
            .then(result => {
              res.send(result);
            })

        } else {
          res.send('list id already exists!');
        }
      })
  } else {
    res.send('prospect list details not loaded');
  }
})

app.get('/initiate-prospect-job', (req, res) => {
  if (testListDetails.loaded) {
    database.listIdExists(testListDetails.listId)
      .then(exists => {
        if (!exists) {
          res.send('prospect job with this list ID does not exist, please create');
        } else {
          console.log('job found');
          database.getJobByListId(testListDetails.listId)
            .then(job => {
              console.log('job:', job);
              if (job.list_sent) {
                if (job.ready_to_download) {
                  res.send('ready to download!');
                } else {
                  res.send('prospect list previously submitted for enrichment, please wait');
                }
              } else {
                res.send('this job be ready to rock and roll!');
                prospect.batchLikers(job.analyzed_username)
                  .then(likers => {
                    console.log('likers found:', likers.length);
                    // at this point you will have public likers as an array of objects which contain:
                    // username, id, picture, fullName, hasAnonymousProfilePicture, isBusiness, isPrivate
                    console.log('business likers:', likers.filter(liker => {
                      return liker.isBusiness == true;
                    }).length);
                    console.log(job.id);
                    saveLikersToProspects(likers, job.id)
                      .then(saveResult => {
                        
                        console.log('return from saving prospects:', saveResult);
                      })
                  })
              }
            })
        }
      })
  } else {
    res.send('prospect list details not loaded');
  }
})

app.get('/test-batch-download-prospects', (req, res) => {
  const downloadURL = getDownloadURL(testListDetails);
  tfBridge.downloadProspects(downloadURL, 4);
  // console.log(downloadURL);
  res.send('downloaded');
})

app.get('/test-get-user-list', (req, res) => {
  const listURL = 'https://staging.truefluence.io/users/lawrencehunt_co/lists.json';
  tfBridge.downloadProspects(listURL);
  res.send('received');
})

app.get('/test-render-send-prospects', (req, res) => {
  res.send('ok');
  var prospectCount;

  
  const prospectJobId = 4; // HEY, make this dynamic


  if (testListDetails.loaded) {
    const submitURL = getSubmitURL(testListDetails);
    console.log(submitURL);
    renderFormattedProspects(prospectJobId) 
      .then(prospects => {
        prospectCount = prospects.length;
        console.log('prospects to transfer:', prospects.length);
        // console.log(prospects);
        batchProspects(prospects).map(batch => {
          // send each batch to tf
          setTimeout(() => {
            tfBridge.submitProspects(submitURL, batch);
          }, 500);
        })
      })
      .then(result => {
        const updateJob = {
          id: prospectJobId,
          list_sent: true,
          prospect_count: prospectCount
        }
        database.updateJob(updateJob)
          .then(done => {
            // confirmed that update occurs
          })
      })
  } else {
    res.send('error: target prospect list not specified');
  }
})

batchProspects = (prospects, batchSize = 1000) => {
  return prospects.map((prospect, i) => {
    return i%batchSize === 0 ? prospects.slice(i, i + batchSize) : null;
  }).filter(elem => { return elem; });
}

renderFormattedProspects = jobId => {
  return new Promise((resolve, reject) => {
    database.getProspectsByJobId(jobId)
      .then(prospects => {
        const formattedProspects = prospects.map(prospect => {
          return [prospect.username, prospect.external_id];
        })
        resolve(formattedProspects);
      })
  })
}

saveLikersToProspects = (likers, jobId) => {
  console.log('attempgint save:', likers.length);
  const splicedLikers = spliceDuplicates(likers);
  console.log('after dupe splice:', splicedLikers.length);
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
      database.updateJobStage(jobId, 'Primed')
        .then(result => {
          resolve(result);
        })
    })
  })
}



// https://staging.truefluence.io/users/eatify/prospects/1013.json?token=oiUBxMQ9KzvBezCyGX1gLDMS&per_page=2&page=5
app.post('/prospect', (req, res) => {
  // get the url
  const url = req.body.upload_url;
  console.log(url);
  listDetails.staging = url.indexOf('/staging.') > 0;
  listDetails.token = getValue(url, 'token=', '&');
  listDetails.username = getValue(url, 'users/');
  listDetails.listId = getValue(url, 'prospects/', '.');
  listDetails.loaded = true;
  console.log(listDetails)
  res.send(listDetails);
})

app.get('/submit-list', (req, res) => {
  if (listDetails.loaded) {
    console.log(submitURL);
    const submitURL = getSubmitURL(listDetails);
    tfBridge.submitProspects(submitURL);
    res.send('list created');
  } else {
    res.send('error: target prospect list not specified');
  }
})

app.get('/test-follower-submit/:userId', (req, res) => {
  
  const submitURL = getSubmitURL(listDetails);
  prospect.getFollowers(req.params.userId)
    .then(result => {
      const followers = result.map(follower => { return [follower.username, follower.id]; }) 
      res.send(followers);
      // tfBridge.submitProspects(submitURL, followers);
    })
})

app.get('/download-list', (req, res) => {
  if (listDetails.loaded) {
    const downloadURL = getDownloadURL(listDetails);
    tfBridge.downloadProspects(downloadURL);
    console.log(downloadURL);
    res.send('downloaded');
  } else {
    res.send('error: target prospect list not specified');
  }
})

app.post('/preload', (req, res) => {
  console.log('preloading');
  res.json('preloading');
  prospect.likers('jesterrulz', req.body, 100, 100);
});

app.put('/test-url', (req, res) => {
  console.log('test-url received');
  console.log('csv contents:', req.body);
  res.send('thanks');
})

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

app.post('/ui-analyze', (req, res) => {
  res.send('request received');
  console.log('type:', req.body.type);
  console.log('parameters:', req.body.parameters);
  const params = {
    username: req.body.type.username,
    days: req.body.type.days
  };
  const filterParams = req.body.parameters;
  prospect.likers(params, filterParams);
})

app.get('/brands', (req, res) => {
  console.log('exporting brands');
  database.getBrands()
    .then(brands => {
      // console.log(brands);
      res.json(brands);
    })
})

app.get('/prospect-list/:primaryUsername', (req, res) => {
  console.log('trying to get prospects of:', req.params.primaryUsername);
  database.getProspects(req.params.primaryUsername)
    .then(prospects => {
      res.json(prospects);
    })
})

app.post('/update-prospect', (req, res) => {
  console.log('attempting to update:', req.body.id, 'params:', req.body.params);
  const id = req.body.id;
  database.updateProspect(id, req.body.params)
    .then(result => {
      res.send('clear');
      console.log('prospect updated');
    })
})

app.get('/load-user/:username', (req, res) => {
  loadUser(req.params.username)
    .then(slug => {
      res.json(slug);
    })
})

const loadUser = (username) => { // now with more resume-ability!
  console.log('loading', username);
  return new Promise((resolve, reject) => {
    ScraperMedia(username)
      .then(slug => {
        resolve(slug);
      })
      .catch(err => {
        console.log('ScraperMedia error');
        reject(err);
      })
  });
}

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

app.post('/preload-prospects', (req, res) => {
  console.log('loading prospects');
  const usernames = req.body.usernames;
  const primaryUsername = req.body.primaryUsername;
  
  async.mapSeries(usernames, (username, next) => {
    database.createProspect(primaryUsername, username)
      .then(result => {
        next();
      })
      .catch(err => {
        console.error(err);
        next();
      })
  }, err => {
    res.send(200, 'loaded');
  });
})

app.post('/enrich', (req, res) => {
  console.log('starting enrich process');
  const usernames = req.body;
  const userIds = [];
  var counter = 0;
  async.mapSeries(usernames, (user, followup) => {
    counter++;
    console.log((counter / usernames.length * 100).toFixed(2));
    scrapeSave(user)
      .then(profile => {
        userIds.push(profile.id);
        followup();
      })
      .catch(err => { // light-weight error handling. not very effective. read up on try/catch and implement further upstream
        console.log('error detected, trying again...');
        console.error(err);
        scrapeSave(user)
          .then(userIds => {
            console.log('second attempt successful');
            userrIds.push(userIds.id);
            followup();
          })
          .catch(err => {
            console.log('second error, continuing');
            followup();
          })
      })
  }, err => {
    database.getUsers(userIds)
      .then(influencers => {
        const headers = ['id', 'externalId', 'username', 'postCount', 'followerCount', 'followingCount', 'following/follower ratio', 'recentPostCount', 'recentAvLikes', 'recentAvComments', 'engagementRatio', 'postFrequency(Hr)', 'website'];
        var influencerData = influencers.map(influencer => { // refactor this mess
          return influencer.id +',' + influencer.external_id + ',' + influencer.username + ',' + influencer.post_count + ',' + influencer.follower_count + ',' + 
          influencer.following_count + ',' + (influencer.following_count / influencer.follower_count) + ',' + influencer.recent_post_count + ',' + (influencer.recent_like_count / influencer.recent_post_count) + ',' +
          (influencer.recent_comment_count / influencer.recent_post_count) + ',' + (influencer.recent_like_count / influencer.recent_post_count) / influencer.follower_count + ',' + ((influencer.recent_post_duration / 3600) / influencer.recent_post_count) + ',' +
          influencer.external_url;
        });
        fileHandler.writeToCSV(influencerData, 'csv-enrich-data', headers)
          .then(result => {
          })
      })
      .catch(err => {
        console.log('getUsers failure');
        console.error(err);
      })
  });
})

app.get('/mentions/:username/:mention', (req, res) => {
  const focusUsername = req.params.username;
  const lookup = req.params.mention.toLowerCase();
  var mentionCount = 0;
  var tagCount = 0;
  res.send('mention analysis for ' + focusUsername);
  scrapeSave(focusUsername, true)
    .then(scraped => {
      ig.getMedias(scraped.external_id, currentSession.session, 3000)
        .then(rawMedias => {
          console.log('posts:', rawMedias.length);
          rawMedias.map(media => {
            if (typeof media.caption != 'undefined' && media.caption.toLowerCase().includes(lookup)) {
              mentionCount++;
            }
            if (typeof media.usertags != 'undefined') {
              const tagged = media.usertags.in;
              tagged.map(tag => {
                if (tag.user.username.toLowerCase() == lookup) {
                  tagCount++;
                }
              })
            }
            return 'ok';
          });
          console.log('mentions: ', mentionCount, ' tags: ', tagCount);
        })
    })
})

app.get('/analyze/:username/:days', (req, res) => {
  console.log('api link established');
  res.send('whats going on?', 200); // connection success
  const params = {
    username: req.params.username,
    days: req.params.days
  };
  prospect.likers(params);
});

app.post('/get-following', (req, res) => {
  res.send('request received');
  ig.getFollowing(req.body.external_id, currentSession.session)
    .then(following => {
      queueFollowing(following, req.body.id)
        .then(result => {
          async.mapSeries(result, (user, next) => {
            database.userSuggestionsLoaded(user.username)
              .then(loaded => {
                next();
              })
          }, err => {
            console.log('complete');
          })
        })
        .catch(err => {
          console.error(err);
        })
    })
});

// show list of rank 1 suggestions as well as frequency of rank 1
app.get('/get-report-rank', (req, res) => {
  var topRanked = [];
  var topRankedDedupe = [];
  var results = [];
  database.getUserByUsername('viewrecip.es')
    .then(user => {
      database.getFollowing(user.id)
        .then(following => {
          async.mapSeries(following, (follow, next) => {
            database.getSuggestionsForUser(follow)
              .then(suggestions => {
                if (suggestions.length > 0) {
                  topRanked = topRanked.concat(suggestions);
                }
                next();
              })
              .catch(err => {
                console.log('error in getting suggestions');
                console.error(err);
                next();
              })
          }, (err, data) => {
            topRanked = topRanked.map(rank => {
              return rank.suggested_id;
            });

            topRankedDedupe = spliceDuplicates(topRanked);

            results = topRankedDedupe.map(user => {
              var filtered = topRanked.filter(result => {
                return result == user;
              })
              return [user, filtered.length];
            });

            async.mapSeries(results, (result, next) => {
              database.getUsernameFromEId(result[0])
                .then(username => {
                  result[0] = username.username;
                  next();
                })
            }, (err, data) => {
              results.sort((a, b) => {
                return b[1] - a[1];
              })
              console.log(results);
            })
          })
        })
    });
});

app.get('/lookup/:username', (req, res) => {
  database.usernameExists(req.params.username)
    .then(result => {
      if (result) {
        database.getUserByUsername(req.params.username)
          .then(user => {
            res.json(user);
          })
      } else {
        scrapeSave(req.params.username)
          .then(scrape => {
            database.getUserByEId(scrape.id)
              .then(user => {
                res.json(user);
              })
          })
      }
    })
})

app.get('/tf-lookup/:username', (req, res) => {
  scrapeSave(req.params.username)
    .then(scrape => {
      database.getUserByEId(scrape.id)
        .then(user => {
          res.json({
            external_id: user.external_id,
            username: user.username,
            follower_count: user.follower_count,
            following_count: user.following_count,
            engagement_ratio: user.following_count / user.follower_count,
            post_count: user.post_count,
            recent_av_like: user.recent_like_count / user.recent_post_count,
            recent_av_comment: user.recent_comment_count / user.recent_post_count,
            like_ratio: (user.recent_like_count / user.recent_post_count) / user.follower_count
          });
        });
    });
});

app.get('/deep-lookup/:username', (req, res) => {
  prospect.deepLookup(req.params.username)
    .then(result => {
      res.send(result);
    })
})

// update this to work with tasks if you decide to use them
const queueFollowing = (following, primaryUserEId) => {
  console.log('queueFollowing activating!');
  const timeNow = new Date(Date.now()).toISOString();
  const upsertedUsers = [];
  return new Promise((resolve, reject) => {
    async.mapSeries(following, (follow, next) => {
      database.getUserByUsername(follow.username)
        .then(result => {
          if (result) {
            upsertedUsers.push(result);
            // (usereid, eid of person user is following)
            database.upsertRelationship(primaryUserEId, result.id, true)
              .then(related => {
                next();
              })
              .catch(err => {
                console.error(err);
                next();
              })
          } else {
            console.log('new user, inserting');
            const profile = { //add task to here
              username: follow.username,
              picture_url: follow.picture,
              full_name: follow.fullName,
              external_id: follow.id,
              private: follow.isPrivate
            };
            database.upsertUser(profile)
              .then(newUser => {
                console.log('newUser:', newUser);
                console.log('profile:', profile);
                profile.id = newUser;
                upsertedUsers.push(profile);
                database.upsertRelationship(primaryUserEId, newUser, true)
                  .then(related => {
                    next();
                  })
                  .catch(err => {
                    console.error(err);
                    next();
                  })
              })
          }
        })
    }, (err, dat) => {
      if (!err) {
        resolve(upsertedUsers);
      } else {
        reject(err);
      }
    })
  })
}


const PORT = process.env.PORT;

http.listen(PORT || 5760, () => {
  console.log('listening on port:', PORT || 5760);
});
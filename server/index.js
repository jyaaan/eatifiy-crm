const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');
const Database = require('./database').Database;
const database = new Database();
const ParseScrape = require('./parse-scrape');
const Scraper = require('./scraper');
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

const http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(staticMiddleware);
app.use(bodyParser.json());

// socket.io stuff
io.on('connection', socket => {
  socket.emit('welcome', {message: 'Connection to Truefluence established', id: socket.id});
});


// incoming JSON template.
// {
//   username: “asddafs”,
//   upload_url: “https://app.truefluence.io/users/{USERNAME}/prospects/{ID}.csv?token=ASDF”
//   follower_count: { min: 234, ideal: 234, max:234 },
//   follower_following_ratio: { min: 234, ideal: 234, max:234 },
//   recent_average_like_rate: { min: 234, ideal: 234, max:234 },
//   recent_average_comment_rate: { min: 234, ideal: 234, max:234 },
//   terms: {
//     aligned: [“asdf”, “asdf” …],
//       misaligned: […]
//   }
// }


// app.post('/prospect', (req, res) => {
//   console.log('incoming prospecting request');
//   console.log('JSON Body:', req.body);
//   res.json('received');
//   prospect.likers(req.body.username, req.body);
// })

// what's being processed.
// fetch('/ui-analyze', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(state)
// })

app.put('/test-url', (req, res) => {
  console.log('test-url received');
  console.log('csv contents:', req.body);
  res.send('thanks');
})
app.post('/prospect', (req, res) => {
  console.log('testing csv send');
  var lineArray = [];
  var rows = [
    ['external_id', 'username', 'score'],
    ['42583188', 'vegancuts', '50'],
    ['2144739358', 'ivoryclasp', '60']
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
  console.log(csvFile);
  signal(csvFile, req.body.upload_url);
  res.send(csvFile);
})

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

// ig.initialize()
//   .then(result => {
//     console.log('initializing session');
//     currentSession.session = result;
//   });

app.get('/discovery', (req, res) => {
  res.send('discovery test');
  ig.discoveryTest(currentSession.session);
})

app.post('/dispatch', (req, res) => {
  io.emit('dispatch', req.body);
})

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
    // filtering users for influencers
    // store.dispatch({
    //   type: 'CHANGE_STAGE',
    //   stage: 'filter'
    // });
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


app.get('/get-me', (req, res) => {
  res.send('kay');
  ig.getFollowing('52139312', currentSession.session)
    .then(following => {
      console.log(following);
    })
})

app.post('/get-following', (req, res) => {
  res.send('request received');
  ig.getFollowing(req.body.external_id, currentSession.session)
    .then(following => {
      queueFollowing(following, req.body.id)
        .then(result => {
          // console.log('following harvest complete result:', result);
          // splice out users where suggestions have been loaded already
          async.mapSeries(result, (user, next) => {
            database.userSuggestionsLoaded(user.username)
              .then(loaded => {
                // if (!loaded) {
                //   autoBrowser.process(user)
                //     .then(processed => {
                //       setTimeout(next, 1000);
                //     })
                // } else {
                  next();
                // }
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

// Commented out in order to load onto digital ocean

// app.get('/get-suggested', (req, res) => {
//   console.log('getting suggested');
//   const userEIds = [];
//   var suggestedUsers = [];

//   async.mapSeries(suggestionTestUsers, (test, next) => {
//     database.getUserByUsername(test)
//       .then(user => {
//         userEIds.push(user.id);
//         database.clearSuggestionRank(user.id)
//           .then(cleared => {
//             autoBrowser.process(user)
//               .then(result => {
//                 next();
//               })
//           })
//       })
//   }, err => {
//     async.mapSeries(userEIds, (eid, next) => {
//       // console.log('eid under investigation:', eid);
//       database.getFirst(eid, 3)
//         .then(suggestions => {
//           suggestedUsers = suggestedUsers.concat(suggestions);
//           next();
//         })

//     }, err => {
//       var lineArray = [];
//       lineArray.push('data:text/csv;charset=utf-8,');
//       var tempstore = suggestedUsers.map(suggested => {
//         return suggested.concat(',');
//       })
//       lineArray = lineArray.concat(...tempstore);

//       var csvContent = lineArray.join("\n");

//       fs.writeFile(

//           './users.csv',

//           csvContent,

//           function (err) {
//               if (err) {
//                   console.error('Crap happens');
//               }
//           }
//       );
//       // console.log(suggestedUsers);
//     })
//   })
// });

app.get('/update-viewrecipes', (req, res) => {
  console.log('starting viewrecip.es update');
  ig.getFollowing('5451104717', currentSession.session)
    .then(following => {
      async.mapSeries(following, (follow, next) => {
        console.log(follow.username);
        database.everScraped(follow.username)
          .then(result => {
            if (!result) {
              scrapeSave(follow.username)
                .then(saved => {
                  next();
                })
            } else {
              console.log('skipping');
              next();
            }
          })
      }, err => {
        console.log('viewrecip.es updated');
      })
    })
})

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

            // console.log(topRanked[1]);
            // anonymous { // sample of returned suggestion data
            //   user_id: 676,
            //   suggested_id: 316,
            //   created_at: 2017-06-13T00:43:13.318Z,
            //   updated_at: 2017-06-13T00:43:13.318Z,
            //   last_rank: 2,
            //   highest_rank: 2 }

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

// show list of suggestions by frequency among following

app.get('/get-report-frequency', (req, res) => {
  // get internal id of target user. look up relationships to generate array of internal ids
  // for each internal id in that array, 
})

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
      // res.send(scrape)
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
  // res.send('deep lookup: ' + req.params.username);
  ig.getUser(req.params.username, currentSession.session)
    .then(user => {
      res.send(user._params);
    });
})

const scrapeSave = (username, bypass=false) => { // now with more resume-ability!
  username = username.trim();
  console.log('scraping', username);
  var thisId;
  return new Promise((resolve, reject) => {
    database.getUserByUsername(username)
      .then(user => {
        // console.log('user:', user);
        if (!user || bypass || user.recent_like_count == 0 || user.recent_like_count == null) {
          Scraper(username)
            .then(user => {
              database.upsertUser(user)
                .then(result => {
                  database.getEIdFromExternalId(user.external_id, 'users')
                    .then(id => {
                      resolve({ id: id[0].id, external_id: user.external_id });
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
          resolve({ id: user.id, external_id: user.external_id });
        }
      })
    .catch(err => {
      console.log('get user by username failure');
      reject(err);
    })
  });
}

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
                // console.log('newUser[0]', newUser[0]);
                // console.log('primary id:', primaryUserEId);
                // (usereid, eid of person user is following)
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


const PORT = 80;

http.listen(PORT, () => {
  console.log('listening on port:', PORT);
});
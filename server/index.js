const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');
const Database = require('./database').Database;
const database = new Database();
const ParseScrape = require('./parse-scrape');
const Scraper = require('./scraper');
const async = require('async');
const AutoBrowser = require('./auto-browser');
const autoBrowser = new AutoBrowser();
var fs = require('fs');

const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };

app.use(staticMiddleware);
app.use(bodyParser.json());

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

ig.initialize()
  .then(result => {
    console.log('initializing session');
    currentSession.session = result;
  });

app.get('/test-media', (req, res) => {
  res.send('otay');
  console.log('testing media');
  ig.getMedias('289436556', currentSession.session)
    .then(medias => {
      console.log(medias);
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
                if (!loaded) {
                  autoBrowser.process(user)
                    .then(processed => {
                      setTimeout(next, 1000);
                    })
                } else {
                  next();
                }
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

const suggestionTestUsers = ['perrysplate','love_and_laundry','pamelaz','garlicandzest','foodologygeek','foodfash','plaidandpaleo','vita_sunshine','creativegreenliving','lemonsforlulu','vegan.chickpea','bowl_me_over','asweetenedlife','nyssas_kitchen','jonesinfortaste','vintagekittyblog','coffeewithus3','asformeandmyhomestead','kyleecooks','the.green.life','go2kitchens','taraobrady','amber_dessertnowdinnerlater','theseasidebaker','everydaymaven','littlefiggyfood'];


app.get('/get-suggested', (req, res) => {
  console.log('getting suggested');
  const userEIds = [];
  var suggestedUsers = [];

  async.mapSeries(suggestionTestUsers, (test, next) => {
    database.getUserByUsername(test)
      .then(user => {
        userEIds.push(user.id);
        database.clearSuggestionRank(user.id)
          .then(cleared => {
            autoBrowser.process(user)
              .then(result => {
                next();
              })
          })
      })
  }, err => {
    async.mapSeries(userEIds, (eid, next) => {
      // console.log('eid under investigation:', eid);
      database.getFirst(eid, 3)
        .then(suggestions => {
          suggestedUsers = suggestedUsers.concat(suggestions);
          next();
        })

    }, err => {
      var lineArray = [];
      lineArray.push('data:text/csv;charset=utf-8,');
      var tempstore = suggestedUsers.map(suggested => {
        return suggested.concat(',');
      })
      lineArray = lineArray.concat(...tempstore);

      var csvContent = lineArray.join("\n");

      fs.writeFile(

          './users.csv',

          csvContent,

          function (err) {
              if (err) {
                  console.error('Crap happens');
              }
          }
      );
      // console.log(suggestedUsers);
    })
  })
});

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

app.post('/lookup', (req, res) => {
  database.usernameExists(req.body.username)
    .then(result => {
      if (result) {
        database.getUserByUsername(req.body.username)
          .then(user => {
            res.json(user);
          })
      } else {
        scrapeSave(req.body.username)
          .then(scrape => {
            database.getUserByEId(scrape.id)
              .then(user => {
                res.json(user);
              })
          })
      }
    })
});

const scrapeSave = username => {
  console.log('scraping', username);
  var thisId;
  return new Promise((resolve, reject) => {
    Scraper(username)
      .then(user => {
        database.upsertUser(user)
          .then(result => {
            database.getEIdFromExternalId(user.external_id, 'users')
              .then(id => {
                resolve({ id: id[0].id, external_id: user.external_id });
              })
          })
      })
      .catch(err => {
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

const PORT = 5760;

app.listen(PORT, () => {
  console.log('listening on port:', PORT);
})
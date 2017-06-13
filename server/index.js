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

const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };

app.use(staticMiddleware);
app.use(bodyParser.json());

ig.initialize()
  .then(result => {
    console.log('initializing session');
    currentSession.session = result;
  });


app.post('/get-following', (req, res) => {
  res.send('request received');
  ig.getFollowing(req.body.external_id, currentSession.session)
    .then(following => {
      queueFollowing(following, req.body.id)
        .then(result => {
          console.log('following harvest complete result:', result);
          async.mapSeries(result, (follow, next) => {
            autoBrowser.process(follow)
              .then(processed => {
                setTimeout(next, 1000);
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

app.post('/get-suggested', (req, res) => {

});

// show list of rank 1 suggestions as well as frequency of rank 1

app.get('/get-report-rank', (req, res) => {
  const topRanked = [];
  const topRankedDedupe = [];
  const results = [];
  database.getUserByUsername('eatify')
    .then(user => {
      database.getTopRanked(user.username);
    });
  results = topRankedDedupe.map(user => {
    const filtered = topRanked.filter(result => {
      return result = user;
    })
    return [user, filtered.length];
  });
  results.map(result => {
    console.log(result);
  })
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
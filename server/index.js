const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');
const Database = require('./database').Database;
const database = new Database();

const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };

app.use(staticMiddleware);
app.use(bodyParser.json());

app.post('/get-following', (req, res) => {

});

app.post('/get-suggested', (req, res) => {

});

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
            database.getUserById(scrape.id)
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
            resolve({ id: id[0].id, external_id: primary.user.external_id });
          })
      })
      .catch(err => {
        reject(err);
      })
  });
}

const PORT = 5760;

app.listen(PORT, () => {
  console.log('listening on port:', PORT);
})
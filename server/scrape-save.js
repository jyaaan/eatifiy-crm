const Scraper = require('./scraper');
const Database = require('./database').Database;
const database = new Database();
function ScrapeSave() {

}

ScrapeSave.prototype.scrapeSave = function (username, bypass = false) { // now with more resume-ability!
  console.log('scraping', username);
  var thisId;
  return new Promise((resolve, reject) => {
    database.getUserByUsername(username)
      .then(user => {
        if (!user || bypass || user.recent_like_count == 0 || user.recent_like_count == null) {
          Scraper(username)
            .then(user => {
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
              setTimeout(() => {
                reject(err);
              }, 120000);
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

module.exports = ScrapeSave;
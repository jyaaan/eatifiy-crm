const Scraper = require('./scraper');
const Database = require('./database').Database;
// const database = new Database();

function ScrapeSave(username, bypass=false) { // now with more resume-ability!
  console.log('scraping', username);
  var thisId;
  return new Promise((resolve, reject) => {
    database.getUserByUsername(username)
      .then(user => {
        // console.log('user:', user);
        if (!user || bypass || user.recent_like_count == 0) {
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
                  reject(err);
                })
            })
            .catch(err => {
              reject(err);
            })
        } else {
          console.log('skipping');
          resolve({ id: user.id, external_id: user.external_id });
        }
      })
  });
}

module.exports = ScrapeSave;
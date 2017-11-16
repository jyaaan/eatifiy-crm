const https = require('https');
const ParseScrape = require('./parse-scrape');

function Scraper(username) {
  return new Promise((resolve, reject) => {
    https.get('https://www.instagram.com/' + username + '/?__a=1', res => {
      var dataQueue = '';

      res.on('data', d => {
        dataQueue += d;
      });

      res.on('uncaughtException', err => {
        console.log('uncaught');
        reject(err);
      });

      res.on('end', () => {
        try {
          var dataJSON = JSON.parse(dataQueue); // add exception handling
          const { user } = ParseScrape(dataJSON);
          resolve(user);
        }
        catch (err) {
          reject(err);
        }
      });

    }).on('error', err => {
      console.log('scraper error 2');
      reject(err);
    });
  });
}

module.exports = Scraper;
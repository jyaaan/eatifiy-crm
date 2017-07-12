const https = require('https');
const ParseScrape = require('./parse-scrape');

function ScraperMedia(username) {
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
        var dataJSON = JSON.parse(dataQueue);
        const { user, medias } = ParseScrape(dataJSON);
        resolve({ user: user, medias: medias });
      });

    }).on('error', err => {
      console.log('scraper error 2');
      reject(err);
    });
  });
}

module.exports = ScraperMedia;
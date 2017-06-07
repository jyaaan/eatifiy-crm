const https = require('https');
const PraseScrape = require('./parse-scrape');

function Scraper(username) {
  return new Promise((resolve, reject) => {
    https.get('https://www.instagram.com/' + username + '/?__a=1', res => {
      var dataQueue = '';

      res.on('data', data => {
        dataQueue += data;
      });

      res.on('uncaughtException', err => {
        reject(err);
      });

      res.on('end', () => {
        var dataJSON = JSON.parse(dataQueue);
        const { user } = ParseScrape(dataJSON);
        resolve(user);
      });

    }).on('error', err => {
      reject(err);
    });
  });
}
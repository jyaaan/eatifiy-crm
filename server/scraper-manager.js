const Scraper = require('./scraper');
const async = require('async');

class ScraperManager {
  constructor() {
    this.scrapers = [];
    const proxies = require('../scraper_proxy_config');
    proxies.forEach(proxy => {
      this.scrapers.push(new Scraper(proxy.url));
    })
    console.log('proxied scrapers loaded');
  }

  scrapeUsers(users) {
    console.log('scrape assignment count: ', users.length);
    var nextScraper;
    return new Promise((resolve, reject) => {
      var userData = [];
      var retryUsers = []; // implement later.
      async.mapSeries(users, (user, next) => {
        nextScraper = getNextAvailableScraper(this.scrapers);
        if (nextScraper) { // nextScraper will be undefined if no scrapers are available
          nextScraper.scrape(user, userData);
          next();
        } else { // keep trying for available scrapers every 300 ms
            var keepAlive = setInterval(() => {
              nextScraper = getNextAvailableScraper(this.scrapers);
              if (nextScraper) {
                clearInterval(keepAlive);
                nextScraper.scrape(user, userData);
                next();
              }
            }, 300) 
        }
      }, err => {
        // console.log('number of retry users: ', retryUsers.length); // implement later
        // wait until all proxies are available
        var awaitCompletion = setInterval(() => {
          if(!scrapersBusy(this.scrapers)) {
            clearInterval(awaitCompletion);
            resolve(userData);
          }
        }, 2000);
      })
    })
  }
  
}

const getNextAvailableScraper = scrapers => {
  return scrapers.find(scraper => { return scraper.available });
}

const retryGetScraper = scrapers => {

}

const scrapersBusy = scrapers => {
  return scrapers.some(scraper => {
    return scraper.available == false;
  })
}

const initiateScrape = (scraper, username) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      scraper.scrape(username)
        .then(result => {
          console.log('scraped: ', result.user.username);
          result.user.created_at = new Date();
          result.user.updated_at = new Date();
          resolve(result.user);
        })
        .catch(err => {
          console.log('error detected');
          reject(err);
        })
    }, 200);
  })
}

module.exports = ScraperManager;
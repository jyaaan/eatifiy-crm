const https = require('https');
const request = require('request');
const ParseScrape = require('./parse-scrape');

const HttpsProxyAgent = require('https-proxy-agent');
// const proxy = 'http://john:M7g7RqY@198.8.86.75:65233'; // don't forget the port, dingus.

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

class Scraper {
  constructor(proxy) {
    console.log('proxy: ', proxy);
    this.agent = new HttpsProxyAgent(proxy);
    this.lastUsed = new Date();
    this.available = true;
  }

  // asynchronous function takes in username and returns JSON of user and latest media data
  scrape(username, arrData) {
    this.available = false;
    console.log('received: ', username)
    // return new Promise((resolve, reject) => { // experimenting without promises
    request({
      uri: 'https://instagram.com/' + username + '/?__a=1',
      method: 'GET',
      agent: this.agent,
      timeout: 6000
    }, (err, res, bod) => {
      if (!err) {
        // hacky solution to get data from profile html
        // var $elem = new JSDOM(bod);
        // var scripts = $elem.window.document.getElementsByTagName('script')
        // for (script in scripts) {
        //   if (scripts[script].textContent && scripts[script].textContent.indexOf('window._sharedData') > -1) {
        //     // user JSON data is found in a script block with some extraneous text before and after
        //     // this process strips these if present
        //     var rawJSON = scripts[script].textContent.replace('window._sharedData =', '');
        //     if (rawJSON[rawJSON.length - 1] == ';') {
        //       rawJSON = rawJSON.slice(0, -1);
        //     }
        //     try {
        //       var formattedJSON = JSON.parse(rawJSON).entry_data.ProfilePage[0].graphql;
        //       // resolve(ParseScrape(formattedJSON));
        //       var user = ParseScrape(formattedJSON);
        //       user.user.created_at = new Date();
        //       user.user.updated_at = new Date();
        //       console.log('scraped: ', user.user.username)
        //       arrDate.push(user.user);
        //       this.available = true;
        //     } catch (error) {
        //       console.log('EOF Error!');
        //       // reject(error);
        //       setTimeout(() => {
        //         this.available = true;
        //       }, 60000)
        //     }
        //   }
        // }

        try { // this is to circumvent the occasional unexpected end of JSON error that pops up.
          var dataJSON = JSON.parse(bod).graphql;
          var user = ParseScrape(dataJSON);
          user.user.created_at = new Date();
          user.user.updated_at = new Date();
          arrData.push(user.user);
          this.available = true;
        } catch (error) {
          console.log('scrape json parse error');
          // console.log(bod);
          setTimeout(() => {
            this.available = true;
          }, 60000)
        }

        
      } else {
        // reject(err);
        console.log('some other error with scraper');
        console.error(err);
        setTimeout(() => {
          this.available = true;
        }, 60000)
      }
    })
    // });
  }
}

module.exports = Scraper;
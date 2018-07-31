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
    // console.log('received: ', username)
    // return new Promise((resolve, reject) => { // experimenting without promises
    request({
      uri: 'https://instagram.com/' + username, // + '/?__a=1',
      // uri: 'https://apinsta.herokuapp.com/u/' + username,
      method: 'GET',
      agent: this.agent,
      timeout: 6000
    }, (err, res, bod) => {
      if (!err) {



        // hacky solution to get data from profile html
        var $elem = new JSDOM(bod);
        var $format = $elem.window.document.documentElement.outerHTML;

        try { // this is to circumvent the occasional unexpected end of JSON error that pops up.
          var user = ParseScrape(returnParsedJSON($format));
          user.user.created_at = new Date();
          user.user.updated_at = new Date();
          arrData.push(user.user);
          // console.log('success: ', username);
          setTimeout(() => {
            this.available = true;
          }, 1200);
        } catch (error) {
          console.error(error);
          // console.error(returnParsedJSON($format));
          console.log('scrape json parse error');
          setTimeout(() => {
            this.available = true;
            console.log('restarting scraper');
          }, 15000)
        }

        
      } else {
        // reject(err);
        console.log('some other error with scraper');
        // console.error(err);
        setTimeout(() => {
          console.log('restarting scraper (other)');
          this.available = true;
        }, 120000)
      }
    })
    // });
  }
}

const returnParsedJSON = html => {
  // This regexp gets widest possible dict around "profile_pic_url"
  // but inside tag <script type="text/javascript">...</script>
  let r = new RegExp('<script type="text/javascript">' +
    '([^{]+?({.*profile_pic_url.*})[^}]+?)' +
    '</script>');

  let jsonStr = html.match(r)[2];
  let data = JSON.parse(jsonStr);
  // console.log(data);
  // try {
    //   return data.entry_data.ProfilePage[0].graphql;
    // } catch (error) {
      //   return data.entry_data.ProfilePage.graphql; // removed [0] from ProfilePage at one point
  // }
  return data.entry_data.ProfilePage[0].graphql;
}

module.exports = Scraper;
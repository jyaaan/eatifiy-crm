const https = require('https');
const request = require('request');
const ParseScrape = require('./parse-scrape');

const HttpsProxyAgent = require('https-proxy-agent');
const proxy = 'http://john:M7g7RqY@192.252.209.48:65233';
const agent = new HttpsProxyAgent(proxy);

function Scraper(username) {
  console.log('received: ', username)
  return new Promise((resolve, reject) => {
    request({
      uri: 'https://instagram.com/' + username + '/?__a=1',
      method: 'GET',
      agent: agent,
      timeout: 6000
    }, (err, res, bod) => {
      if (!err) {
        var dataJSON = JSON.parse(bod).graphql
        resolve(ParseScrape(dataJSON));
      } else {
        reject(err);
      }
      // console.log('res: ', res);
      // var dataQueue = '';

      // res.on('data', d => {
      //   dataQueue += d;
      // });

      // res.on('uncaughtException', err => {
      //   console.log('uncaught');
      //   reject(err);
      // });

      // res.on('end', () => {
      //   try {
      //     var dataJSON = JSON.parse(dataQueue); // add exception handling
      //     // const { user } = ParseScrape(dataJSON);
      //     resolve(dataJSON);
      //   }
      //   catch (err) {
      //     reject(err);
      //   }
      // });
    })
    // https.request({
    //   host: 'http://john:M7g7RqY@192.252.209.48:65233',
    //   path: 'https://www.instagram.com/123chocula/?__a=1',
    //   method: 'GET',
    //   agent: agent,
    //   timeout: 10000
    // }, res => {
      // console.log('res: ', res);
      // var dataQueue = '';

      // res.on('data', d => {
      //   dataQueue += d;
      // });

      // res.on('uncaughtException', err => {
      //   console.log('uncaught');
      //   reject(err);
      // });

      // res.on('end', () => {
      //   try {
      //     var dataJSON = JSON.parse(dataQueue); // add exception handling
      //     const { user } = ParseScrape(dataJSON);
      //     resolve(user);
      //   }
      //   catch (err) {
      //     reject(err);
      //   }
      // });
    //   }).on('error', err => {
    //     console.log('scraper error: request rejection');
    //     reject(err);
    //   });
  });
}


// LEGACY
// function Scraper(username) {
//   return new Promise((resolve, reject) => {
//     https.get('https://www.instagram.com/' + username + '/?__a=1', res => {
//       var dataQueue = '';

//       res.on('data', d => {
//         dataQueue += d;
//       });

//       res.on('uncaughtException', err => {
//         console.log('uncaught');
//         reject(err);
//       });

//       res.on('end', () => {
//         try {
//           var dataJSON = JSON.parse(dataQueue); // add exception handling
//           const { user } = ParseScrape(dataJSON);
//           resolve(user);
//         }
//         catch (err) {
//           reject(err);
//         }
//       });

//     }).on('error', err => {
//       console.log('scraper error 2');
//       reject(err);
//     });
//   });
// }

module.exports = Scraper;
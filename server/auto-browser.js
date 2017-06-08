var webdriver = require('selenium-webdriver'),
  By = webdriver.By,
  until = webdriver.until;

var driver = new webdriver.Builder()
  .withCapabilities(webdriver.Capabilities.chrome())
  .build();

const async = require('async');
const Database = require('./database').Database;
const database = new Database();

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

function AutoBrowser() {

}

AutoBrowser.prototype.process = function (user) {
  // const user = {
  //   username: profile.username,
  //   picture_url: profile.picture,
  //   full_name: profile.fullName,
  //   external_id: profile.id,
  //   private: profile.isPrivate
  // };
  console.log('starting process, user:', user);
  const timeNow = new Date(Date.now()).toISOString();
  return new Promise((resolve, reject) => {
    lookupUser(user)
      .then(suggestions => {
        console.log('retrieved suggestions:', suggestions);
        const dedupedSuggestions = spliceDuplicates(suggestions);
        console.log('after splicing:', spliceDuplicates(suggestions));
        async.mapSeries(dedupedSuggestions, (suggested, next) => {
          const profile = {
            username: suggested
          };
          database.upsertUser(profile)
            .then(id => {
              database.upsertSuggestion(user.id, id, dedupedSuggestions.indexOf(suggested) + 1)
                .then(upsert => {
                  next();
                })
            })
        }, err => {
          user.last_suggested_updated_at = timeNow;
          user.last_suggested_count = dedupedSuggestions.length;
          database.updateUser(user)
            .then(finished => {
              resolve(finished);
            })
        });
      });
  })
}


function login() {
  return new Promise((resolve, reject) => {
    driver.get('https://www.instagram.com/accounts/login/')
    driver.wait(until.titleIs('Login • Instagram', 1000));
    driver.findElement(By.className('_kp5f7 _qy55y'))
      .sendKeys('eatifyjohn')
      .then(result => {
        driver.findElement(By.className('_kp5f7 _1mdqd _qy55y'))
          .sendKeys('occsbootcamp');
        })
          .then(second => {
            console.log('form entry complete');
            driver.findElement(By.className('_ah57t _84y62 _i46jh _rmr7s'))
              .click();
            })
        driver.wait(until.titleIs('Instagram'))
          .then(waited => {
            console.log('login successful, async process started');  
            console.log('waited', waited);
            resolve('done');
          })
        })
}

function getSuggested() {
  const suggestedUsers = [];
  return new Promise((resolve, reject) => {
    driver.findElements(By.css('._7svr2'))
      .then(focus => {
        async.mapSeries(focus, (user, next) => {
          user.findElement(By.className('_4zhc5 _77kjb')).getText() // changed to a more specific element
            .then(name => {
              const a = suggestedUsers.indexOf(name);
              if (name != '' && a == -1) suggestedUsers.push(name);
              // USE THIS TO CHECK IF USER IS VERIFIED
              // user.findElement(By.className('_soakw'))
              //   .then(element => {
              //     // user is verified
              //   }, err => {
              //     // user is not verified
              //   })
              next();
            })
        }, (err, dev) => {
          resolve(suggestedUsers);
        })
      })
  })
}

function lookupUser(user) { // returns a raw list of suggested usernames. usually includes duplicates
  var suggestedUsers = [];
  return new Promise((resolve, reject) => {
    function getNext() {
        getSuggested()
            .then(result => {
                console.log('getnext output:', ...result);
                suggestedUsers = suggestedUsers.concat(...result);
                driver.findElement(By.className('_soakw _ifqgl'))
                    .then(webElement => {
                        driver.findElement(By.className('_soakw _ifqgl'))
                            .click()
                            .then(() => {
                                setTimeout(() => {
                                    getNext();
                                }, 1100)
                            })
                    }, err => {
                        // console.log('all suggested:', suggestedUsers);
                        resolve(suggestedUsers);
                    })
            });
    }
    driver.get('https://www.instagram.com/' + user.username)
    var title;
    if (user.full_name == '' || user.full_name == user.username) {
      title = '@' + user.username + ' • Instagram photos and videos';
    } else {
      title = user.full_name + ' (@' + user.username + ') • Instagram photos and videos';
    }
    console.log('full name:', user.full_name, 'title:', title);
    driver.wait(until.titleIs(title))
    .then(result => {
      driver.findElement(By.className('_5eykz'))
        .click();
      setTimeout(() => {
        getNext();
      }, 2000);
    });
  });
}

login();

// login()
//     .then(result => {
//         lookupUser('laurenelyce'); // this is a test
//     })

module.exports = AutoBrowser;
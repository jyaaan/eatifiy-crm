var webdriver = require('selenium-webdriver'),
  By = webdriver.By,
  until = webdriver.until;

var driver = new webdriver.Builder()
  .withCapabilities(webdriver.Capabilities.chrome())
  .build();

const async = require('async');


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
          user.findElement(By.className('_m0jj1')).getText()
            .then(name => {
              const a = suggestedUsers.indexOf(name);
              if (name != '' && a == -1) suggestedUsers.push(name);
              next();
            })
        }, (err, dev) => {
          resolve(suggestedUsers);
        })
      })
  })
}

function lookupUser(username) {
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
                                }, 1000)
                            })
                    }, err => {
                        console.log('all suggested:', suggestedUsers);
                        resolve('complete');
                    })
            })
    }
    driver.get('https://www.instagram.com/' + username)
    var title;
    var fullName;
    if (fullName == '') {
      title = username + ' • Instagram photos and videos';
    } else {
      title = fullName + ' (@' + username + ') • Instagram photos and videos';
    }
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

login()
    .then(result => {
        lookupUser('laurenelyce');
    })

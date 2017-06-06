var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();



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
                console.log('second:', second);
                // setTimeout(() => {
                    driver.findElement(By.className('_ah57t _84y62 _i46jh _rmr7s'))
                        .click();
                // }, 2000);
            })
        driver.wait(until.titleIs('Instagram'))
            .then(waited => {
                console.log('async?');  
                console.log('waited', waited);
                resolve('done');
            })

        })

}
function getSuggested() {
  return new Promise((resolve, reject) => {
    driver.findElements(By.css('._7svr2'))
        .then(focus => {
          focus.map(user => {
            user.findElement(By.className('_m0jj1')).getText()
              .then(name => {
                console.log('name: ', name);
              })
          })
          resolve('done');
        })

  })
}

function lookupUser(username) {
  function lookAhead() {
    return new Promise((resolve, reject) => {
      driver.findElements(By.css('._7svr2'))
        .then(focus => {
          focus.map(user => {
            user.findElement(By.className('_m0jj1')).getText()
              .then(name => {
                console.log('name: ', name);
                // if (!driver.findElements(By.className('_soakw _ifqgl'))) {
                //   resolve('complete');
                // } else {
                  driver.findElement(By.className('_soakw _ifqgl'))
                    .click()
                    .then(() => {
                      setTimeout(() => {
                        resolve('more');
                      }, 2000);
                    })
                // }
              })
            })
          })
    })
  }
    driver.get('https://www.instagram.com/' + username)
    driver.wait(until.titleIs('@' + username + ' • Instagram photos and videos'))
    .then(result => {
    driver.findElement(By.className('_5eykz'))
        .click()
        .then(() => {
            // var collectSuggested = setInterval(() => {
            //     lookAhead()
            //         .then(result => {
            //             if (result == 'complete') {
            //                 clearInterval(collectSuggested);
            //             }
            //         })
            // }, 3000);
            // driver.findElements(By.className('_6exzz'))
            // .then(unfocus => {
            // console.log('nubmer of unfocused:', unfocus.length);
            // })
            setTimeout(() => {
                getSuggested()
                    .then(result => {
                    driver.findElement(By.className('_soakw _ifqgl'))
                        .click()
                        .then(() => {
                            setTimeout(() => {
                            getSuggested();
                            }, 2000);
                        })
                    })
            }, 2000);
        })
    })
}

login()
    .then(result => {
        lookupUser('123chocula');
    })
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();



function login() {
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
            driver.get('https://www.instagram.com/123chocula');
        })
    driver.wait(until.titleIs('@123chocula • Instagram photos and videos'))
        .then(result => {
            driver.findElement(By.className('_5eykz'))
                .click();
        })
}

login();
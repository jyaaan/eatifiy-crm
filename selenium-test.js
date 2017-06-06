var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();



function login() {
    driver.get('https://www.instagram.com/accounts/login/')
        .then(browse => {
            console.log('browse:', browse);
        })
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
}

login();
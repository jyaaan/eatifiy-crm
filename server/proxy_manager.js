const proxies = require('../proxy_config');
const Proxy = require('./proxy');
const async = require('async');
/*
  const performance = {
    usageCount: 0,
    totalErrors: 0,
    lastInitiazlied: null,
    lastCompleted: null,
    lastErrorCount: 0,
    consecutiveErrors: 0
  }
*/
class ProxyManager {
  constructor() {
    this.proxies = [];
    async.mapSeries(proxies, (proxy, next) => {
      this.proxies.push(new Proxy(proxy));
      setTimeout(() => {
        next();
      }, 1000);
    })
    this.tfProxy = new Proxy(require('../tf_proxy_config'));
    console.log('proxies loaded');
  }

  getMedias(userIds) {
    console.log('media pull assignment count: ', userIds.length)
    var nextProxy;
    return new Promise((resolve, reject) => {
      var arrMedias = [];
      async.mapSeries(userIds, (userId, next) => {
        nextProxy = nextAvailableProxy(this.proxies);
        if (nextProxy) {
          nextProxy.getMedia(userId, arrMedias);
          next();
        } else {
          var keepAlive = setInterval(() => {
            nextProxy = nextAvailableProxy(this.proxies);
            if (nextProxy) {
              clearInterval(keepAlive);
              nextProxy.getMedia(userId, arrMedias);
              next();
            }
          }, 300);
        }
      }, err => {
        var awaitCompletion = setInterval(() => {
          if(!proxiesBusy(this.proxies)) {
            clearInterval(awaitCompletion);
            resolve(arrMedias);
          }
        }, 2000);
      })
    })
  }
  
  getNextProxy() { // janky approach, make this better.
    return this.proxies.filter(proxy => {
      return !proxy.connError;
    })
    .reduce((prev, curr) => {
      return prev.performanceHistory.usageCount < curr.performanceHistory.usageCount ? prev : curr;
    })
  }

}

const getNextAvailableProxy = proxies => {
  return proxies.find(proxy => { return proxy.available });
}

const proxiesBusy = proxies => {
  return proxies.some(proxy => {
    return proxy.available == false;
  })
}

module.exports = ProxyManager;

/*
var arrTest = [{a: 1}, {a: 2}, {a: 0}];
undefined
arrTest
(3) [{…}, {…}, {…}]0: {a: 1}1: {a: 2}2: {a: 0}length: 3__proto__: Array(0)
arrTest.reduce((prev, curr) => { return prev.a < curr.a ? prev : curr; });
{a: 0}
const minObj = arrTest.reduce((prev, curr) => { return prev.a < curr.a ? prev : curr;});
undefined
minObj
{a: 0}
arrTest
(3) [{…}, {…}, {…}]
arrTest[2];
{a: 0}
arrTest[2].a = 3;
3
minObj;
{a: 3}
*/
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
      }, 3000);
    })
    this.tfProxy = new Proxy(require('../tf_proxy_config'));
    console.log('proxies loaded');
  }

  getMedias(userIds) {
    console.log('media pull assignment count: ', userIds.length)
    var nextProxy;
    var arrMedias = [];
    return new Promise((resolve, reject) => {
      async.mapSeries(userIds, (userId, next) => {
        nextProxy = getNextAvailableProxy(this.proxies);
        if (nextProxy) {
          nextProxy.getMedia(userId, arrMedias);
          next();
        } else {
          var keepAlive = setInterval(() => {
            // console.log('no proxies available');
            var retryProxy = getNextAvailableProxy(this.proxies);
            if (retryProxy) {
              clearInterval(keepAlive);
              retryProxy.getMedia(userId, arrMedias);
              next();
            }
          }, 750);
        }
      }, err => {
        console.log('media pull for batch completed, checking busy');
        var awaitCompletion = setInterval(() => {
          console.log('proxy manager waiting for green light');
          if(!proxiesBusy(this.proxies)) {
            clearInterval(awaitCompletion);
            resolve(arrMedias);
          } else {
            var busyProxy = this.proxies.find(proxy => {
              return proxy.available == false;
            })
            console.log('busy: ', busyProxy.ig_username);

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

batchProspects = (prospects, batchSize = 1000) => {
  return prospects.map((prospect, i) => {
    return i % batchSize === 0 ? prospects.slice(i, i + batchSize) : null;
  }).filter(elem => { return elem; });
}

module.exports = ProxyManager;
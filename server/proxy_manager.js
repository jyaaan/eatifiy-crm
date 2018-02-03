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

      }, 5000);
    })
    // proxies.map(proxy => {
    //   this.proxies.push(new Proxy(proxy));
    // })
  }

  getNextProxy() { // janky approach, make this better.
    return this.proxies.reduce((prev, curr) => {
      return prev.performanceHistory.usageCount < curr.performanceHistory.usageCount ? prev : curr;
    })
  }

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
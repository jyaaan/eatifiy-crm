const initializePerformance = () => {
  const performance = {
    usageCount: 0,
    totalErrors: 0,
    lastInitiazlied: null,
    lastCompleted: null,
    lastErrorCount: 0,
    consecutiveErrors: 0
  }

  return performance;
}
const getProxyURL = (mode = 'http') => {
  let addressBuilder = (mode == 'https' ? 'https://' : 'http://');
  addressBuilder += this.username + ':' + this.password + '@';
  addressBuilder += this.proxyAddress + ':' + this.port;
  return addressBuilder;
}

class Proxy {
  constructor (proxyObj, ig) {
    Object.assign(this, proxyObj);
    this.proxyURL = getProxyURL('http');
    var tempSession = {}; // confirm if this is necessary.
    ig.initialize(username, password, proxyURL)
      .then(session => {
        console.log('is this proxy or ig?', this);
        // this.session = session;
        tempSession = session;
      })
      .catch(err => {
        console.error(err);
      })
    this.session = tempSession; // delete if scope works in favor
    this.performanceHistory = initializePerformance();
  }
}

module.exports = Proxy;
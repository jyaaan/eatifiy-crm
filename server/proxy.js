const IG = require('./ig');

const initializePerformance = () => {
  const performance = {
    usageCount: 0,
    totalErrors: 0,
    lastInitialized: null,
    lastCompleted: null,
    lastErrorCount: 0,
    consecutiveErrors: 0,
    totalUsers: 0,
    totalCandidates: 0
  }

  return performance;
}

class Proxy {
  constructor (proxyObj) {
    Object.assign(this, proxyObj);
    this.ig = new IG(this.ig_username, this.ig_password, this.getProxyURL());
    this.performanceHistory = initializePerformance();
    this.connError = false;
    this.ig.initialize()
      .then(session => {
        this.session = session;
      })
      .catch(err => {
        this.connError = true;
        console.log('error, removing prosy: ' + this.ig_username);
        console.error(err);
      })
  }
  
  getProxyURL(mode = 'http') {
    let addressBuilder = (mode == 'https' ? 'https://' : 'http://');
    addressBuilder += this.username + ':' + this.password + '@';
    addressBuilder += this.proxyAddress + ':' + this.port;
    return addressBuilder;
  }
}

module.exports = Proxy;
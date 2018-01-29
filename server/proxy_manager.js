const proxies = require('../proxy_config');
const Proxy = require('./proxy');



class ProxyManager {
  constructor() {
    this.proxies = {};
    Object.assign(this.proxies, proxies);
    this.proxies.map((proxy) => {

    })
    proxies.map(proxy => {
      this.proxies.add(new Proxy(proxy));
    })

    // test by output
  }
}
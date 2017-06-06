const Client = require('instagram-private-api').V1;
const device = new Client.Device('eatifyjohn');
const path = require('path');
const cookiePath = path.join(__dirname, '/cookies/eatifyjohn.json');
const storage = new Client.CookieFileStorage(cookiePath);

function IG() {

}

IG.prototype.getFollowing = function (userId, session) {
  const following = [];
  const startTime = new Date();

  return new Promise((resolve, reject) => {
    let feed = new Client.Feed.AccountFollowing(session, userId)
    function retrieve() {
      feed.get()
        .then(result => {
          result.map(user => { following.push(user._params)})
          if (feed.isMoreAvailable()) {
            setTimeout(() => {
              retrieve()
            }, 3000);
          } else {
            resolve(following);
          }
        })
    }
    retrieve();
  })
}

IG.prototype.initialize = function () {
  return new Client.Session.create(device, storage, 'eatifyjohn', 'occsbootbamp')
    .then(session => {
      return session;
    })
}

module.exports = IG;
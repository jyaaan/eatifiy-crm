

Date.prototype.formatMMDDYYYY = function () {
  return ((this.getMonth() + 1) + "/" + this.getDate() + "/" + this.getFullYear());
};
const Client = require('instagram-private-api').V1;
const path = require('path');
class IG {
  constructor(username, password, proxyURL) {
    console.log(username);
    this.username = username;
    this.password = password;
    this.proxyURL = proxyURL;
    this.device = new Client.Device(username);
    this.cookiePath = path.join(__dirname, '../tmp/cookies/' + username);
    this.storage = new Client.CookieFileStorage(this.cookiePath);
    // this.initialize()
  }

  discover() { // returns 100 suggested users for session user
    Client.discover(this.session)
      .then(discovery => {
        return discovery.map(discovered => { return discovered.account._params });
      })
  }

  getFollowing(userId) {
    const following = [];
    const startTime = new Date();

    return new Promise((resolve, reject) => {
      let feed = new Client.Feed.AccountFollowing(this.session, userId);
      function retrieve() {
        feed.get()
          .then(result => {
            result.map(user => { following.push(user._params); })
            if (feed.isMoreAvailable()) {
              setTimeout(() => {
                retrieve();
              }, 3000);
            } else {
              resolve(following);
            }
          })
      }
      retrieve();
    })
  }

  getFollowers(userId, session) {
    const followers = [];
    return new Promise((resolve, reject) => {
      let feed = new Client.Feed.AccountFollowers(session, userId);
      function retrieve() {
        // console.log('getting followers');
        feed.get()
          .then(result => {
            result.map(user => { followers.push(user._params); });
            if (feed.isMoreAvailable()) {
              setTimeout(() => {
                retrieve();
              }, 5000);
            } else {
              console.log('finished');
              resolve(followers);
            }
          })
      }
      retrieve();
    })
  }
  
  checkInbox(externalId) {
    return new Promise((resolve, reject) => {
      let feed = new Client.Feed.Inbox(session, limit = 10);
      const retrieve = () => {
        feed.get()
          .then(result => {
            resolve(result);
          })
          .catch(err => {
            reject(err);
          })
      }
      retrieve();
    })
  }

  sendMessage(externalId, message) {
    return new Promise((resolve, request) => {
      new Client.Thread.configureText(this.session, externalId, message)
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        })
    })
  }


  getUser(username) {
    console.log('get user:', username);
    return new Promise((resolve, reject) => {
      new Client.Account.search(this.session, username)
        .then((result) => {
          resolve(result);
        });
      // resolve(session);
    });
  }

  initializeMediaFeed(userId) {
    return new Promise((resolve, reject) => {
      try {
        var feed = new Client.Feed.UserMedia(this.session, userId);
        resolve(feed);
      }
      catch(err) {
        reject(err);
      }
    })
  }

  getMedias(userId, session, days=30) {
    const medias = [];
    var dateRange = new Date();
    var errorDate = new Date(2010, 1, 1);
    var validDate = true;
    dateRange.setDate(dateRange.getDate() - days);
    // console.log('date ' + days + ' ago:', dateRange.formatMMDDYYYY());
    return new Promise((resolve, reject) => {
      let feed = new Client.Feed.UserMedia(session, userId);
      function retrieve() {
        feed.get()
          .then(result => {
            result.map(media => { 
              // console.log('deviceTimestamp:', media._params.deviceTimestamp);
              const timeStamp = media._params.deviceTimestamp;
              var postDate = timeStamp > 1500000000 ? new Date(timeStamp) : new Date(timeStamp * 1000);
              // console.log('converted date:', postDate.formatMMDDYYYY());
              if (postDate > dateRange || postDate < errorDate) {
                medias.push(media._params);
              } else {
                console.log('date out of range');
                validDate = false;
              }
            });
            if (feed.moreAvailable && validDate) {
              setTimeout(() => {
                retrieve(); // recursion here. 
              }, 1200);
            } else {
              resolve(medias);
            }
          });
      };
      retrieve();
    });
  }


  // gets first 1,000 likers of given media
  // results are concise
  getLikers(media) {
    // console.log('getLikers');
    return new Promise((resolve, reject) => {
      // console.log('getlikers active');
      // console.log('media id: ', media.id);
      Client.Media.likers(this.session, media.id)
        .then(likers => {
          // console.log('likers found:', likers.length);
          const concise = likers.map(liker => { return liker._params; });
          resolve(concise);
        })
        .catch(err => {
          console.error('getLikers failure');
          reject(err);
        })
    })
  }

  getMediaLikers(mediaId) {
    
  }

  createPost(mediaPath, caption) {
    return new Promise((resolve, reject) => {
      Client.Upload.photo(this.session, mediaPath)
        .then(upload => {
          return Client.Media.configurePhoto(this.session, upload.params.uploadId, caption);
        })
        .then(medium => {
          resolve(medium.params);
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  initialize() {
    return new Promise((resolve, reject) => {
      new Client.Session.create(this.device, this.storage, this.username, this.password, this.proxyURL)
        .then(resolve)
        .catch(reject)
    })
  }
}
module.exports = IG;
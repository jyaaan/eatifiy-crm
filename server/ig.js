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
    let feed = new Client.Feed.AccountFollowing(session, userId);
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

IG.prototype.getMedias = function (userId, session) {
  const medias = [];
  console.log('and here we are');
  return new Promise((resolve, reject) => {
    let feed = new Client.Feed.UserMedia(session, userId);
    function retrieve() {
      feed.get()
        .then(result => {
          result.map(media => { 
            medias.push(media); 
            console.log('concise:', media._params);
            console.log('comments:', media.comments);
            console.log('user tags:', media._params.usertags);
          });
          resolve(medias);
        });
    };
    retrieve();
  });
}

IG.prototype.initialize = function () {
  return new Client.Session.create(device, storage, 'jakeydenton', 'instagram123')
    .then(session => {
      return session;
    })
}

module.exports = IG;
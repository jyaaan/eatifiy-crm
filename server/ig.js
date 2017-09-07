const Client = require('instagram-private-api').V1;
const device = new Client.Device('eatifyjohn');
const path = require('path');
const cookiePath = path.join(__dirname, '../tmp/cookies/eatifyjohn.json');
const storage = new Client.CookieFileStorage(cookiePath);

function IG() {

}

IG.prototype.discover = function (session) { // returns 100 suggested users for session user
  Client.discover(session)
    .then(discovery => {
      return discovery.map(discovered => { return discovered.account._params });
    })
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

Date.prototype.formatMMDDYYYY = function(){
	return ((this.getMonth()+1)+"/"+this.getDate()+"/"+this.getFullYear());
};

IG.prototype.getUser = function (username, session) {
  return new Promise((resolve, reject) => {
    new Client.Account.searchForUser(session, username)
      .then((result) => {
        resolve(result);
      });
  });
}

IG.prototype.initializeMediaFeed = function (userId, session) {
  return new Promise((resolve, reject) => {
    try {
      var feed = new Client.Feed.UserMedia(session, userId);
      resolve(feed);
    }
    catch(err) {
      reject(err);
    }
  })
}

IG.prototype.getMedias = function (userId, session, days=30) {
  const medias = [];
  var dateRange = new Date();
  var errorDate = new Date(2010, 1, 1);
  var validDate = true;
  dateRange.setDate(dateRange.getDate() - days);
  console.log('date ' + days + ' ago:', dateRange.formatMMDDYYYY());
  return new Promise((resolve, reject) => {
    let feed = new Client.Feed.UserMedia(session, userId);
    function retrieve() {
      feed.get()
        .then(result => {
          result.map(media => { 
            // console.log('media', media._params);
            // if (typeof media._params.usertags != 'undefined') {
            //   // media._params.usertags.in will yield an array of user objects.
            //   // user.username .pk for external_id
            //   console.log('usertags', media._params.usertags.in);
            // }
            console.log('deviceTimestamp:', media._params.deviceTimestamp);
            const timeStamp = media._params.deviceTimestamp;
            var postDate = timeStamp > 1500000000 ? new Date(timeStamp) : new Date(timeStamp * 1000);
            console.log('converted date:', postDate.formatMMDDYYYY());
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

IG.prototype.getLikers = function (media, session) {
  console.log('getLikers');
  return new Promise((resolve, reject) => {
    Client.Media.likers(session, media.id)
      .then(likers => {
        const concise = likers.map(liker => { return liker._params; });
        resolve(concise);
      })
  })

}

IG.prototype.initialize = function () {
  return new Client.Session.create(device, storage, 'eatifyjohn', 'occsbootcamp')
    .then(session => {
      return session;
    })
}

module.exports = IG;
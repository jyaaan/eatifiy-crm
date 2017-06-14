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

Date.prototype.formatMMDDYYYY = function(){
	return ((this.getMonth()+1)+"/"+this.getDate()+"/"+this.getFullYear());
};

IG.prototype.getMedias = function (userId, session) {
  const medias = [];
  console.log('and here we are');
  var date30Ago = new Date();
  var validDate = true;
  date30Ago.setDate(date30Ago.getDate() - 30);
  console.log('date 30 ago:', date30Ago.formatMMDDYYYY());
  return new Promise((resolve, reject) => {
    let feed = new Client.Feed.UserMedia(session, userId);
    function retrieve() {
      feed.get()
        .then(result => {
          result.map(media => { 
            // console.log('concise:', media._params);
            // console.log('comments:', media.comments);
            // console.log('user tags:', media._params.usertags);
            console.log('deviceTimestamp:', media._params.deviceTimestamp);
            var postDate = new Date(media._params.deviceTimestamp * 1000);
            console.log('converted date:', postDate.formatMMDDYYYY());
            if (postDate > date30Ago) {
              medias.push(media._params); 
            } else {
              validDate = false;
            }
          });
          if (feed.isMoreAvailable && validDate) {
            retrieve();
          } else {
            resolve(medias);
          }
        });
    };
    retrieve();
  });
}

IG.prototype.getLikers = function (media, session) {
  return new Promise((resolve, reject) => {
    Client.Media.likers(session, media.id)
      .then(likers => {
        const concise = likers.map(liker => { return liker._params; });
        resolve(concise);
      })
  })

}

IG.prototype.initialize = function () {
  return new Client.Session.create(device, storage, 'jakeydenton', 'instagram123')
    .then(session => {
      return session;
    })
}

module.exports = IG;
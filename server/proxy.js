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
    // console.log(this);
    this.ig = new IG(this.ig_username, this.ig_password, this.getProxyURL());
    this.performanceHistory = initializePerformance();
    this.connError = false;
    this.available = true;
    this.ig.initialize()
      .then(session => {
        this.ig.session = session;
      })
      .catch(err => {
        this.connError = true;
        console.log('error, removing proxy: ' + this.ig_username);
        console.error(err);
      })
  }
  
  getProxyURL(mode = 'http') {
    let addressBuilder = (mode == 'https' ? 'https://' : 'http://');
    addressBuilder += this.username + ':' + this.password + '@';
    addressBuilder += this.proxyAddress + ':' + this.port;
    return addressBuilder;
  }

  getMedia(userId, arrMedias) {
    this.available = false;
    console.log(this.ig_username + ' received: ' + userId);
    this.ig.initializeMediaFeed(userId)
      .then(feed => {
        // console.log('initialization successful');
        setTimeout(() => {
          feed.get()
            .then(medias => {
              if (medias.length > 0) {
                // console.log('medias found');
                medias.forEach(media => {
                  var formattedMedia = parseMedia(media);
                  formattedMedia.user_external_id = userId;
                  formattedMedia.created_at = new Date();
                  formattedMedia.updated_at = new Date();
                  arrMedias.push(formattedMedia);
                })
              }
              this.available = true;
            })
            .catch(err => {
              console.error('feed error: ', this.ig_username);
              setTimeout(() => {
                this.available = true;
              }, 60000)
            })
        }, 800);
      })
      .catch(err => {
        console.error('initialization error');
        setTimeout(() => {
          this.available = true;
          console.log('resuming: ', this.ig_username);
        }, 60000)
      })
  }
}

const parseMedia = media => {
  // console.log(media._params);
  // console.log(media._params.images);
  const imageLink = media._params.images[0].url ? media._params.images[0].url : media._params.images[0][0].url
  var imageURL = imageLink.indexOf('?') > -1 ? imageLink.substr(0, imageLink.indexOf('?')) : imageLink;
  const thumbLink = media._params.images[1].url ? media._params.images[1].url : media._params.images[0][1].url
  var thumbURL = thumbLink.indexOf('?') > -1 ? thumbLink.substr(0, thumbLink.indexOf('?')) : thumbLink;
  var photoUsernames = [];
  var photoExternalIds = [];
  if (media._params.usertags) {
    media._params.usertags.in.forEach(user => { photoUsernames.push(user.user.username) });
    media._params.usertags.in.forEach(user => { photoExternalIds.push(String(user.user.pk)) });
    photoUsernames = photoUsernames.toString();
    photoExternalIds = photoExternalIds.toString();
  } else {
    photoUsernames = null;
    photoExternalIds = null;
  }
  return {
    posted_at: new Date(media._params.takenAt),
    external_id: String(media._params.id),
    user_external_id: String(media.account._params.id),
    image_low: imageURL,
    image_standard: imageURL,
    image_thumbnail: thumbURL,
    caption: media._params.caption ? media._params.caption.replace(/'/g, '') : '',
    link: media._params.webLink,
    like_count: media._params.likeCount,
    comment_count: media._params.commentCount,
    type: media._params.mediaType = 1 ? 'image' : media._params.mediaType = 2 ? 'video' : 'carousel',
    filter_type: media._params.filterType ? media._params.filterType : null,
    photo_usernames: photoUsernames,
    photo_external_user_ids: photoExternalIds,
    latitude: media.location ? media.location._params.lat : null,
    longitude: media.location ? media.location._params.lng : null,
  }
}

module.exports = Proxy;
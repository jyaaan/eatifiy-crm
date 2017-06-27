class InfluencerFilter {
  constructor(settings) {
    const { follower_count, following_count, external_url, ratio, terms } = settings;

    this.follower_count = follower_count;
    this.follower_count.filter = function(user) {
      return eval(user.follower_count, this);
    }

    this.following_count = following_count;
    this.following_count.filter = function(user) {
      return eval(user.following_count, this);
    }

    this.external_url = external_url;
    this.external_url.filter = function(user) {
      const webCount = user.external_url == '' ? 0 : 1;
      return eval(webCount, this);
    }

    this.ratio = ratio;
    this.ratio.filter = function(user) {
      const userRatio = user.following_count / user.follower_count;
      return eval(userRatio, this);
    }

    this.terms = terms;
    this.terms.filter = function(user) {
      return true;
    }
  }

  filter(user) {
    for (let key in this) {
      if (!this[key].filter(user)) {
        return false;
      }
    }
    return true;
  }
}

const eval = (val, paramObj) => {
  if (typeof paramObj.max != 'undefined' && val > paramObj.max) {
    return false;
  }
  if (typeof paramObj.min != 'undefined' && val < paramObj.min) {
    return false;
  }
  return true;
}

module.exports = InfluencerFilter;
class influencerFilter {
  constructor(settings) {
    const { follower_count, following_count, external_url, ratio } = settings;

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
  }


  filter(user) {
    var result = true;
    for (let key in this) {
      console.log('looking at', key);
      if (!this[key].filter(user)) {
        console.log(key, ' failed');
        result = false;
      }
    }
    return result;
  }

  test() {
    var result = true;
    for (let key in this) {
      console.log('looking at', key);
      if (!this[key].filter(user)) {
        console.log(key, ' failed');
        result = false;
      }
    }
    return result;
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

const exampleSettings = {
  follower_count: {
    max: 250000,
    min: 1000
  },
  following_count: {

  },
  external_url: {
    min: 1
  },
  ratio: {
    max: 0.1
  }
}

const testUser = {
  following_count: 18,
  follower_count: 1000,
  external_url: 'something'
}

var testFilter = new influencerFilter(exampleSettings);
console.log(testFilter.filter(testUser));
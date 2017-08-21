const tfScore = require('./tf-score');

class InfluencerFilter { // comments, please.
  constructor(settings) {
    console.log('influencer filter params:', settings);

    const { follower_count, follower_following_ratio,
            terms, recent_average_comment_rate,
            recent_average_like_rate } = settings;

    if (follower_count) {
      this.follower_count = follower_count;
      this.follower_count.filter = function(user) {
        return evaluate(user.follower_count, this);
      }
    }

    if (follower_following_ratio) {
      this.follower_following_ratio = follower_following_ratio;
      this.follower_following_ratio.filter = function(user) {
        const userRatio = user.follower_count / user.following_count;
        return evaluate(userRatio, this);
      }
    }

    this.terms = terms;
    this.terms.filter = function(user) {
      return !(matchTerms(this.misaligned, user.bio) > 0);
    }

    if (recent_average_comment_rate){
      this.recent_average_comment_rate = recent_average_comment_rate;
      this.recent_average_comment_rate.filter = function(user) {
        const avCommentCount = user.recent_comment_count / user.recent_post_count;
        return evaluate(avCommentCount, this);
      }
    }

    if (recent_average_like_rate) {
      this.recent_average_like_rate = recent_average_like_rate;
      this.recent_average_like_rate.filter = function(user) {
        const avLikeCount = user.recent_like_count / user.recent_post_count;
        return evaluate(avLikeCount, this);
      }
    }
  }

  filter(user) { // method to verify if user is valid
    for (let key in this) {
      if (!this[key].filter(user)) {
        return false;
      }
    }
    return true;
  }

  score(user) { // method to verify and score user
    user.isValid = true;
    user.score = 0;
    user.termMatch = 0;
    for (let key in this) {
      if (!this[key].filter(user)) { // if it falls into the min/max
        user.isValid = false;
      }
    }
    if (user.isValid) {
      user.score = tfScore(user, this);
      user.termMatch = matchTerms(this.terms.aligned, user.bio); // number of matches
    }
    return user;
  }
}

const matchTerms = (terms, text) => {
  var count = 0;
  var searchText = '';
  if (typeof text != 'undefined') {
    searchText = text.toLowerCase();
  }
  for (var term in terms) {
    if (searchText.indexOf(terms[term].toLowerCase()) != -1) {
      count++;
    }
  }
  return count;
}

const evaluate = (val, paramObj) => { // fix null handling once DO server is functional.
  if ((typeof paramObj.max != 'undefined' && paramObj.max != null) && val > paramObj.max) {
    return false;
  }
  if ((typeof paramObj.min != 'undefined' && paramObj.min != null) && val < paramObj.min) {
    return false;
  }
  return true;
}

module.exports = InfluencerFilter;
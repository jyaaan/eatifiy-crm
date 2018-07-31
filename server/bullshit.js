function bullshit(user) {
  var score = 0;
  const ffRatio = user.follower_count > 0 
                  ? user.following_count / user.follower_count
                  : 0;
  const commentToLikeRatio = user.recent_average_likes > 0 
                             ? user.recent_average_comments / user.recent_average_likes
                             : 0;

  const postToFollowerRatio = user.follower_count > 0 
                              ? user.post_count / user.follower_count
                              : 0;

  const isInfluencer = user.follower_count > 2000 ? true : false;
  // check if default photo (consumer)
  if (user.picture_url.includes('11906329_960233084022564_1448528159_a')) {
    score += 4;
  }

  // check post count < 30 is warning < 10 is red flag (both)
  // max 3
  if (user.post_count < 10) {
    score += 3;
  } else if (user.post_count < 30) {
    score += 1;
  } else if (isInfluencer && user.post_count < 100) {
    score += 3;
  }

  // if consumer (< 1000 followers), ptf ratio < 0.05 if influencer, ptf ratio < 0.01 if under 200k followers
  // (both)
  if (!isInfluencer && postToFollowerRatio < 0.05) {
    score += 3;
  } else if (user.follower_count >= 2000 && user.follower_count < 200000 && postToFollowerRatio < 0.01) {
    score += 3;
  }

  // Bio is empty (consumer)
  if (user.bio = '') { // !user.bio, maybe?
    score += 2;
  }

  // if posts in last 30 days is more than 50 % of their total posts.
  // (both)
  if (user.recent_post_count >= (user.post_count * 0.5)) {
    if (isInfluencer) {
      score += 10;
    } else {
      score += 2;
    }
  }

  // No posts in 30 days is mild (both)
  if (user.recent_post_count == 0) {
    score += 2;
  } else {
    //Comment to Like ratio is < (influencer)
    if (isInfluencer && commentToLikeRatio < 0.05) {
      score += 4;
    }
  
    // Engagement Rate is < 2% (influencer)
    if (isInfluencer && user.recent_engagement_rate < 0.02) {
      score += 3;
    } 
  }

  
  // Follower to Following ratio is > 1 : 5
    //  > 1: 10 red flag
    //    > 1: 20 black flag
  // (both)
  if (isInfluencer) {
    if (ffRatio > 1) {
      score += 3;
    } else if (ffRatio > 0.33) {
      score += 1;
    }
  } else {
    if (user.following_count > 200) {
      if (ffRatio > 20 || ffRatio == 0) {
        score += 7;
      } else if (ffRatio > 10) {
        score += 5;
      } else if (ffRatio > 5) {
        score += 3;
      }
    }
  }
  // 42 % overall private rate is threshold.
  // 7.9 % of all users tend to be spam bots, so apply this to private.
  // 0 followers
  // (consumer)
  if (user.follower_count == 0 || user.following_count == 0) {
    score += 3;
  }
  
  if (isInfluencer) {
    return 'influencer: ' + score;
    // return score >= 5;
  } else {
    return 'consumer: ' + score;
    // return score >= 6;
  }
}

module.exports = bullshit;
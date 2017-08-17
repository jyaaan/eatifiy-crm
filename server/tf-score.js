function tfScore(user, filter) {
  // const { followers, posts } = params;
    // username: “asddafs”,
    // upload_url: “https://app.truefluence.io/users/{USERNAME}/prospects/{ID}.csv?token=ASDF”
    // follower_count: { min: 234, ideal: 234, max:234 },
    // follower_following_ratio: { min: 234, ideal: 234, max:234 },
    // recent_average_like_rate: { min: 234, ideal: 234, max:234 },
    // recent_average_comment_rate: { min: 234, ideal: 234, max:234 },
    // terms: {
    //   aligned: [“asdf”, “asdf” …],
    //     misaligned: […]
    // }
  var score = 0;
  var nullModifier = 100;
  const avLikeCount = user.recent_like_count / user.recent_post_count;
  const avCommentCount = user.recent_comment_count / user.recent_post_count;
  const likeRatio = avLikeCount / user.follower_count;
  const commentRatio = avCommentCount / user.follower_count;
  const ffRatio = user.following_count / user.follower_count;
  const engagementRatio = ((user.recent_like_count + user.recent_comment_count) / user.recent_post_count) / user.follower_count;
  const ratioDiff = likeRatio - commentRatio;
  const postFrequency = ((user.recent_post_duration / 3600) / user.recent_post_count);

  var dateNow = new Date();
  var secondsNow = dateNow.getTime() / 1000;
  const youngestPost = (secondsNow - user.youngest_post) / 3600;
  // graduated score: value, min, ideal, max, points possible

  // av like count
  if (filter.recent_average_like_rate) {
    score += graduatedScore(avLikeCount, filter.recent_average_like_rate.min,
      filter.recent_average_like_rate.ideal, filter.recent_average_like_rate.max, 25);
  } else {
    nullModifier -= 25;
  }
  
  //av comment count
  if (filter.recent_average_comment_rate) {
    score += graduatedScore(avCommentCount, filter.recent_average_comment_rate.min,
      filter.recent_average_comment_rate.ideal, filter.recent_average_comment_rate.max, 25);
  } else {
    nullModifier -= 25;
  }

  // follower count
  if (filter.follower_count) {
    score += graduatedScore(user.follower_count, filter.follower_count.min, 
      filter.follower_count.ideal, filter.follower_count.max, 20);
  } else {
    nullModifier -= 20;
  }

  // console.log('score after marker', score);
  // engagement rate
  score += graduatedScore(engagementRatio, 0.00, 0.1, 0.6, 20);

  // console.log('youngest post:', youngestPost);
  // most recent post
  console.log('score before point', score);
  console.log('youngestPost:', youngestPost);
  if (youngestPost) {
    score += graduatedScore(youngestPost, 0.0, 12, 168, 10);
  } else {
    nullModifier -= 10;
  }
  console.log('score after point', score);

  //add debuffs here
  // if (postFrequency > 300) {
  //   score *= 0.9;
  // }
  if (engagementRatio < 0.01) {
    score *= 0.85;
  }
  // null modifier (if min/max weren't defined)
  // flattens out scores
  if (nullModifier < 100) {
    score = score * (100 / nullModifier);
  }
  return score;
}

const postCount = count => {
  if (count > 200) {
    return 20;
  }
}

// currently if no min is specified, graduated from 0 to ideal
// if no max is specified, graduated from ideal to double ideal, .25 * points beyond that.
const graduatedScore = (value, min, ideal, max, points) => {
  // if (!min) {
  //   if (value < min)
  // }
  // if (value < min || value > max ) {
  //   return 0;
  // }

  if (max) {
    if (value > max) {
      return 0;
    }
  }
  if (ideal) {
    if (value == ideal) {
      return points;
    }

    if (value < ideal) {
      if (typeof min != 'undefined' && min != null) {
        return ((value - min) / (ideal - min)) * points;
      } else {
        return (value / ideal) * points;
      }
    } else {
      if (typeof max != 'undefined' && max != null) {
        return ((max - value) / (max - ideal)) * (0.9 * points);
      } else {
        if ((value - ideal) > ideal) {
          return 0.25 * points;
        } else {
          return (0.25 * points) + (1 - ((value - ideal) / ideal)) * (0.75 * points);
        }
      }
    }
  } else {
    return 0;
  }
}

module.exports = tfScore;
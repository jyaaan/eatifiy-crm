function tfScore(user, params) {
  const { followers, posts } = params;

  var score = 0;
  const avLikeCount = user.recent_like_count / user.recent_post_count;
  const avCommentCount = user.recent_comment_count / user.recent_post_count;
  const likeRatio = avLikeCount / user.follower_count;
  const commentRatio = avCommentCount / user.follower_count;
  const ffRatio = user.following_count / user.follower_count;
  const engagementRatio = ((user.recent_like_count + user.recent_comment_count) / user.recent_post_count) / user.follower_count;
  const ratioDiff = likeRatio - commentRatio;
  const postFrequency = ((user.recent_post_duration / 3600) / user.recent_post_count);

  score += graduatedScore(user.post_count, 60, 120, 4000, 15);
  score += graduatedScore(user.follower_count, 10000, 80000, 250000, 20);
  score += graduatedScore(ffRatio, 0.0005, 0.1, 0.5, 20);
  score += graduatedScore(engagementRatio, 0.00, 0.4, 0.6, 30);
  score += graduatedScore(postFrequency, 6, 72, 300, 15);

  //add debuffs here
  if (postFrequency > 300) {
    score *= 0.9;
  }
  if (engagementRatio < 0.01) {
    score *= 0.85;
  }
  return score;
}

const postCount = count => {
  if (count > 200) {
    return 20;
  }
}

const graduatedScore = (value, min, optimal, max, points) => {
  if (value < min || value > max ) {
    return 0;
  }

  if (value == optimal) {
    return points;
  }

  if (value < optimal) {
    return ((value - min) / (optimal - min)) * points;
  } else {
    return ((max - value) / (max - optimal)) * points;
  }
}

module.exports = tfScore;
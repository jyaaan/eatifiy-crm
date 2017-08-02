
function bullshit(user) {
  var score = 0;
  const avLikeCount = user.recent_like_count / user.recent_post_count;
  const avCommentCount = user.recent_comment_count / user.recent_post_count;
  const likeRatio = avLikeCount / user.follower_count;
  const commentRatio = avCommentCount / user.follower_count;
  const ffRatio = user.following_count / user.follower_count;
  const engagementRatio = (user.recent_like_count + user.recent_comment_count) / user.recent_post_count;
  const ratioDiff = likeRatio - commentRatio;
  const postFrequency = ((user.recent_post_duration / 3600) / user.recent_post_count);
  if (ratioDiff > 0.15) {
    score++;
  }
  if (ffRatio < 0.01 || ffRatio > 0.75) {
    score++;
    if (engagementRatio > 0.5) {
      score++;
    }
  }
  if (user.post_count < 80) {
    score++;
    if (engagementRatio > 0.5) {
      score++;
    }
  }
  if (engagementRatio > 0.5) {
    score++;
  }

  if (postFrequency > 300) {
    score++;
  }

  if (avCommentCount <= 5) {
    score++;
    if (ratioDiff > 0.15) {
      score++;
    }
  }

  if (score > 5 && user.follower_count < 15000) {
    score++;
  }
  return score;
}

module.exports = bullshit;
const ParseScrape = objJSON => {
  const user = {
      username: objJSON.user.username,
      picture_url: objJSON.user.profile_pic_url,
      full_name: objJSON.user.full_name ? objJSON.user.full_name : '',
      external_id: objJSON.user.id,
      private: objJSON.user.is_private,
      following_count: objJSON.user.follows.count,
      follower_count: objJSON.user.followed_by.count,
      bio: objJSON.user.biography ? objJSON.user.biography : '',
      post_count: objJSON.user.media.count,
      external_url: objJSON.user.external_url ? objJSON.user.external_url : ''
  };
  if (objJSON.user.media.nodes.length > 0) {
      user.recent_post_count = objJSON.user.media.nodes.length;

      user.recent_like_count = objJSON.user.media.nodes.map(media => {
        return media.likes.count;
      }).reduce((tot, val) => {
        return tot + val;
      }, 0);

      user.recent_comment_count = objJSON.user.media.nodes.map(media => {
        return media.comments.count;
      }).reduce((tot, val) => {
        return tot + val;
      }, 0);

      // Dates from IG are in Epoch seconds
      const youngestPost = objJSON.user.media.nodes.map(media => { // replace with spread operator
          return media.date;
      }).reduce((high, curr) => {
          return Math.max(high, curr);
      }, 0);
      // Dates from IG are in Epoch seconds
      const oldestPost = objJSON.user.media.nodes.map(media => { // replace with spread operator
          return media.date;
      }).reduce((low, curr) => {
          return Math.min(low, curr);
      }, 99999999999999);
      user.recent_post_duration = youngestPost - oldestPost;
  }
//   console.log('user:', user);
  return {
      user: user
  };
};

module.exports = ParseScrape;
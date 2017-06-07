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
  return {
      user: user
  };
};

module.exports = ParseScrape;
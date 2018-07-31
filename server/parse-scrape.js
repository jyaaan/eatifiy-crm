
const addDays = (begin, numberOfDays) => {
    var tempDate = new Date();
    tempDate.setDate(begin.getDate() + numberOfDays);
    return tempDate;
}

const thirtyAgo = addDays(new Date(), -30);
const ParseScrape = objJSON => {

var medias = [];
const user = {
    username: objJSON.user.username,
    picture_url: objJSON.user.profile_pic_url,
    full_name: objJSON.user.full_name ? objJSON.user.full_name : '',
    external_id: objJSON.user.id,
    private: objJSON.user.is_private,
    following_count: objJSON.user.edge_follow.count,
    follower_count: objJSON.user.edge_followed_by.count,
    bio: objJSON.user.biography ? objJSON.user.biography : '',
    post_count: objJSON.user.edge_owner_to_timeline_media.count,
    website: objJSON.user.external_url ? objJSON.user.external_url : ''
};
// console.log(result.user.edge_owner_to_timeline_media.edges[0]);
// console.log('comment count:' + result.user.edge_owner_to_timeline_media.edges[0].node.edge_media_to_comment.count);
// console.log('like count:' + result.user.edge_owner_to_timeline_media.edges[0].node.edge_liked_by.count);
// console.log(result.user.edge_owner_to_timeline_media.edges[0].node.edge_media_to_caption.edges[0].node.text);
if (objJSON.user.edge_owner_to_timeline_media.edges.length > 0) {
    // Dates from IG are in Epoch seconds
    const postCount = objJSON.user.edge_owner_to_timeline_media.edges.length;
    user.recent_post_count = objJSON.user.edge_owner_to_timeline_media.edges.filter(media => {
        var takenAt = new Date(media.node.taken_at_timestamp * 1000);
        return takenAt > thirtyAgo;
    }).length;

    user.recent_like_count = objJSON.user.edge_owner_to_timeline_media.edges.map(media => {
        return media.node.edge_liked_by.count;
    }).reduce((tot, val) => {
        return tot + val;
    }, 0);

    user.recent_comment_count = objJSON.user.edge_owner_to_timeline_media.edges.map(media => {
        return media.node.edge_media_to_comment.count;
    }).reduce((tot, val) => {
        return tot + val;
    }, 0);

    user.recent_average_likes = postCount > 0 ? user.recent_like_count / postCount : 0;

    user.recent_average_comments = postCount > 0 ? user.recent_comment_count / postCount : 0;

    user.recent_engagement_rate = user.follower_count > 0 ? (user.recent_average_comments + user.recent_average_likes) / user.follower_count : 0;

    user.recent_like_rate = user.follower_count > 0 ? user.recent_average_likes / user.follower_count : 0;

    user.recent_comment_rate = user.follower_count > 0 ? user.recent_average_comments / user.follower_count : 0;

}

    return {
        user: user
    };
};

module.exports = ParseScrape;
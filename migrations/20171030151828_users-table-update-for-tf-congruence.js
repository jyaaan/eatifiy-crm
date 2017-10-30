
exports.up = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.integer('recent_video_count');
    table.decimal('days_since_last_post');
    table.decimal('recent_average_likes');
    table.decimal('recent_engagement_rate');
    table.decimal('recent_average_comments');
    table.decimal('recent_like_rate');
    table.decimal('recent_comment_rate');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('recent_video_count');
    table.dropColumn('days_since_last_post');
    table.dropColumn('recent_average_likes');
    table.dropColumn('recent_engagement_rate');
    table.dropColumn('recent_average_comments');
    table.dropColumn('recent_like_rate');
    table.dropColumn('recent_comment_rate');
  });

  return query;
};

exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('task_id');
    table.dropColumn('verified');
    table.dropColumn('user_tags_count');
    table.dropColumn('instagram_token');
    table.dropColumn('last_suggested_updated_at');
    table.dropColumn('last_suggested_count');
    table.dropColumn('recent_post_duration');
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.integer('task_id').defaultTo(null);
    table.boolean('verified').defaultTo(false);
    table.integer('user_tags_count').notNull().defaultTo(0);
    table.string('instagram_token');
    table.unique('instagram_token');
    table.timestamp('last_suggested_updated_at').defaultTo(null);
    table.integer('last_suggested_count').defaultTo(null);
    table.integer('recent_post_duration').defaultTo(null);
  });

  return query;
};
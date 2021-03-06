
exports.up = function(knex, Promise) {
  const query = knex.schema.createTable('users', table => {
    table.increments('id').notNull();
    table.string('username').notNull();
    table.unique('username');
    table.string('picture_url').notNull().defaultTo('');
    table.string('full_name').notNull().defaultTo('');
    table.string('external_id').defaultTo('');
    table.boolean('private').notNull().defaultTo(false);
    table.integer('user_tags_count').notNull().defaultTo(0);
    table.integer('following_count').notNull().defaultTo(0);
    table.integer('follower_count').notNull().defaultTo(0);
    table.text('bio').notNull().defaultTo('');
    table.integer('post_count').notNull().defaultTo(0);
    table.string('external_url').notNull().defaultTo('');
    table.timestamp('created_at').notNull();
    table.timestamp('updated_at').notNull();
    table.string('instagram_token');
    table.unique('instagram_token');
    table.integer('recent_like_count').notNull().defaultTo(0);
    table.integer('recent_comment_count').notNull().defaultTo(0);
    table.decimal('truefluence_score').notNull().defaultTo(0.0);
    table.integer('task_id').defaultTo(null);
    table.boolean('verified').defaultTo(false);
  });

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.dropTable('users');

  return query;
};


exports.up = function (knex, Promise) {
  const query = knex.schema.createTable('medias', table => {
    table.increments('id').notNull();
    table.timestamp('posted_at').notNull();
    table.string('external_id').notNull();
    table.unique('external_id');
    table.string('user_external_id').notNull();
    table.string('image_low').notNull();
    table.string('image_standard').notNull();
    table.string('image_thumbnail').notNull();
    table.string('caption', 3000).defaultTo('');
    table.string('link').notNull();
    table.integer('like_count');
    table.integer('comment_count');
    table.integer('type');
    table.integer('filter_type');
    table.string('photo_usernames').defaultTo('[]');
    table.string('photo_external_user_ids').defaultTo('[]');
    table.decimal('latitude');
    table.decimal('longitude');
  });

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.dropTable('medias');

  return query;
};
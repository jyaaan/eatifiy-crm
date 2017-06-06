
exports.up = function(knex, Promise) {
  const query = knex.schema.createTable('suggestions', table => {
    table.integer('user_id').notNull();
    table.integer('suggested_id').notNull();
    table.timestamp('created_at').notNull();
    table.unique(['user_id', 'suggested_id']);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.dropTable('suggestions');

  return query;
};


exports.up = function(knex, Promise) {
  const query = knex.schema.createTable('relationships', table => {
    table.integer('user_id').notNull();
    table.integer('following_id').notNull();
    table.timestamp('created_at').notNull();
    table.timestamp('updated_at').notNull();
    table.boolean('following').notNull().defaultTo(true);
    table.unique( ['user_id','following_id'] );
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.dropTable('relationships');

  return query;
};

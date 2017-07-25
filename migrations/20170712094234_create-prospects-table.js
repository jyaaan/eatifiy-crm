
exports.up = function(knex, Promise) {
  const query = knex.schema.createTable('prospects', table => {
    table.increments('id').notNull();
    table.string('username').notNull();
    table.string('external_id').defaultTo('');
    table.timestamp('created_at').notNull();
    table.timestamp('updated_at').notNull();
    table.integer('task_id').defaultTo(null);
    table.boolean('prospect').defaultTo(false);
    table.string('category').defaultTo(null);
    table.boolean('accepted').defaultTo(null);
    table.string('primary_username');
  });

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.dropTable('prospects');

  return query;
};
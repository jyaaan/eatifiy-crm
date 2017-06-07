
exports.up = function(knex, Promise) {
  const query = knex.schema.createTable('tasks', table => {
    table.increments('id').notNull();
    table.integer('primary_user_id').notNull();
    table.string('type').notNull();
    table.string('status').notNull().defaultTo('queued');
    table.string('last_cursor').defaultTo(null);
    table.boolean('following_list_complete').notNull().defaultTo(false);
    table.integer('count').notNull().defaultTo(0);
    table.timestamp('created_at').notNull();
    table.timestamp('last_started_at');
    table.timestamp('last_completed_at');
  });

  return query;
};

exports.down = function(knex, Promise) {
    const query = knex.schema.dropTable('tasks');
    return query;
};
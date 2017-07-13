
exports.up = function(knex, Promise) {
  const query = knex.schema.table('tasks', table => {
    table.string('primary_username');
    table.boolean('prospect_list_complete').notNull().defaultTo(false);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('tasks', table => {
    table.dropColumn('primary_username');
    table.dropColumn('prospect_list_complete');
  });

  return query;
};

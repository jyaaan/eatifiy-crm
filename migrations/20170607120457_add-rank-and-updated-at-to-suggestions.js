
exports.up = function(knex, Promise) {
  const query = knex.schema.table('suggestions', table => {
    table.timestamp('updated_at').defaultTo(null);
    table.integer('last_rank').defaultTo(null);
    table.integer('highest_rank').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('suggestions', table => {
    table.dropColumn('updated_at');
    table.dropColumn('last_rank');
    table.dropColumns('highest_rank');
  });

  return query;
};

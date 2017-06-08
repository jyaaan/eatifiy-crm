
exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.integer('last_suggested_count').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('last_suggested_count');
  });
  
  return query;
};

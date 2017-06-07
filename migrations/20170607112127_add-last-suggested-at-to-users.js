
exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.timestamp('last_suggested_updated_at').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('last_suggested_updated_at');
  });
  
  return query;
};

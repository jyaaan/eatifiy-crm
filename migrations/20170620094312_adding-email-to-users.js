
exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.string('email').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('email');
  });
  
  return query;
};

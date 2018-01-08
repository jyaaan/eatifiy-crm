
exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropUnique('username');
  });
  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.unique('username');
  })

  return query;  
};
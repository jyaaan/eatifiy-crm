
exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.unique('external_id');
  })

  return query;  
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropUnique('external_id');
  });
  return query;
};

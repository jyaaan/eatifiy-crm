
exports.up = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.string('first_name');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('first_name');
  });

  return query;
};
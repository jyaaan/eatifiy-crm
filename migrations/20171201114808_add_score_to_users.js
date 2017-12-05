
exports.up = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.decimal('truefluence_score');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('truefluence_score');
  });

  return query;
};

exports.up = function (knex, Promise) {
  const query = knex.schema.table('prospects', table => {
    table.integer('user_id');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('prospects', table => {
    table.dropColumn('user_id');
  });

  return query;
};
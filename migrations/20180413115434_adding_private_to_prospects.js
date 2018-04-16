
exports.up = function (knex, Promise) {
  const query = knex.schema.table('prospects', table => {
    table.boolean('private');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('prospects', table => {
    table.dropColumn('private');
  });

  return query;
};
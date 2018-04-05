
exports.up = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.renameColumn('external_url', 'website');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.renameColumn('website', 'external_url');
  });

  return query;
};

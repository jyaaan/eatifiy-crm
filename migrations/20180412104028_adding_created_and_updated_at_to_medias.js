
exports.up = function (knex, Promise) {
  const query = knex.schema.table('medias', table => {
    table.timestamp('created_at').notNull();
    table.timestamp('updated_at').notNull();
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('medias', table => {
    table.dropColumn('created_at');
    table.dropColumn('updated_at');
  });

  return query;
};

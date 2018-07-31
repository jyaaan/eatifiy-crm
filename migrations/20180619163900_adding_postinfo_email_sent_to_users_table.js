
exports.up = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.boolean('sent_postinfo_email').defaultTo(false);
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('sent_postinfo_email');
  });

  return query;
};
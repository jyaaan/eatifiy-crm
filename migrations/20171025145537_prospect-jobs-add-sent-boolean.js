
exports.up = function (knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.boolean('list_sent').defaultTo(false);
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.dropColumn('list_sent');
  });

  return query;
};
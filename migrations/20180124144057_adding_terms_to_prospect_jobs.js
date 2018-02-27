
exports.up = function(knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.jsonb('terms').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.dropColumn('terms');
  });

  return query;
};

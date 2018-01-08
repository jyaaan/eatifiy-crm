
exports.up = function(knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.string('upload_url').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.dropColumn('upload_url');
  });

  return query;
};

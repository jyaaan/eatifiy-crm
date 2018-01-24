
exports.up = function(knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.integer('target_list_id').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('prospect_jobs', table => {
    table.dropColumn('target_list_id');
  });

  return query;
};

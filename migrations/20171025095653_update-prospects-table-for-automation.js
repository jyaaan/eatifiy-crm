
exports.up = function (knex, Promise) {
  const query = knex.schema.table('prospects', table => {
    table.dropColumn('task_id');
    table.dropColumn('prospect');
    table.dropColumn('category');
    table.dropColumn('primary_username');
    table.dropColumn('accepted');
    
    table.integer('prospect_job_id');
    table.string('relationship_type');
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('prospects', table => {
    table.integer('task_id').defaultTo(null);
    table.boolean('prospect').defaultTo(false);
    table.string('category').defaultTo(null);
    table.string('primary_username');
    table.boolean('accepted').defaultTo(null);

    table.dropColumn('prospect_job_id');
    table.dropColumn('relationship_type');
  });

  return query;
};


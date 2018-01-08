
exports.up = function (knex, Promise) {
  const query = knex.schema.createTable('prospect_jobs', table => {
    table.increments('id').notNull();

    table.integer('prospect_list_id');
    table.string('token');
    table.string('primary_username');
    table.string('analyzed_username');

    table.string('stage');
    table.timestamp('created_at').notNull();
    table.timestamp('updated_at').notNull();
    table.string('filter_params');
    table.integer('prospect_count');
    table.boolean('ready_to_download').defaultTo(false);
  });

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.dropTable('prospect_jobs');

  return query;
};
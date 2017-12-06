
exports.up = function (knex, Promise) {
  const query = knex.schema.table('prospect-jobs', table => {
    table.timestamp('queued_at').defaultTo(null);
    table.boolean('queued').defaultTo(false);
    table.boolean('in_progress').defaultTo(false);
  })

  return query;
};

exports.down = function (knex, Promise) {
  const query = knex.schema.table('prospect-jobs', table => {
    table.dropColumn('queued_at');
    table.dropColumn('queued');
    table.dropColumn('in_progress');
  });

  return query;
};

exports.up = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.integer('recent_post_count').defaultTo(null);
    table.integer('recent_post_duration').defaultTo(null);
  })

  return query;
};

exports.down = function(knex, Promise) {
  const query = knex.schema.table('users', table => {
    table.dropColumn('recent_post_count');
    table.dropColumn('recent_post_duration');
  });
  
  return query;
};

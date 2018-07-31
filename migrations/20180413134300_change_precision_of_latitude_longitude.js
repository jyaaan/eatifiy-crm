
exports.up = function (knex, Promise) {
  const alter = knex.schema.alterTable('medias', table => {
    table.decimal('latitude', 12, 8).alter();
    table.decimal('longitude', 12, 8).alter();
  });

  return alter;
};

exports.down = function (knex, Promise) {
  const alter = knex.schema.alterTable('medias', table => {
    table.decimal('latitude', 8, 2).alter();
    table.decimal('longitude', 8, 2).alter();
  });

  return alter;
};
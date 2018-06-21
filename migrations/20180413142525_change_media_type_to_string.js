
exports.up = function (knex, Promise) {
  const alter = knex.schema.alterTable('medias', table => {
    table.string('type').alter();
  });

  return alter;
};

exports.down = function (knex, Promise) {
  const alter = knex.schema.alterTable('medias', table => {
    table.integer('type').alter();
  });

  return alter;
};
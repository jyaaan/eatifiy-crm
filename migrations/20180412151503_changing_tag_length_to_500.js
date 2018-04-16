
exports.up = function (knex, Promise) {
  const alter = knex.schema.alterTable('medias', table => {
    table.string('photo_usernames', 1000).alter();
    table.string('photo_external_user_ids', 1000).alter();
  });

  return alter;
};

exports.down = function (knex, Promise) {
  const alter = knex.schema.alterTable('medias', table => {
    table.string('photo_usernames', 255).alter();
    table.string('photo_external_user_ids', 255).alter();
  });

  return alter;
};
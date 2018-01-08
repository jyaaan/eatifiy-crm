
exports.up = function(knex, Promise) {
  const alter = knex.schema.alterTable('users', table => {
    table.text('bio').alter();
  });

  return alter;
};

exports.down = function(knex, Promise) {
  const alter = knex.schema.alterTable('users', table => {
    table.string('bio').alter();
  });

  return alter;  
};

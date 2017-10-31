
exports.up = function (knex, Promise) {
  const query = knex.schema.table('prospect-jobs', table => {
    table.unique('prospect_list_id');
  })

  return query;
};

exports.down = function (knex, Promise) {

};
exports.development = {
  client: 'postgresql',
  connection: {
    user: 'johny',
    password: 'peanut',
    database: 'eatify-crm'
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
};

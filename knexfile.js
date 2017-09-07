exports.development = {
  client: 'postgresql',
  connection: {
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DB_NAME,
    port: process.env.RDS_DB_NAME,
    host: process.env.RDS_HOSTNAME
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
};

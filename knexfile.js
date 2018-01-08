const envs = require('./envs'); // envs.json contains object for all env vars
Object.assign(process.env, envs);
console.log('db name:', process.env.RDS_DB_NAME);

// exports.development = {
//   client: 'postgresql',
//   connection: {
//     user: process.env.RDS_USERNAME,
//     password: process.env.RDS_PASSWORD,
//     database: process.env.RDS_DB_NAME,
//     port: process.env.RDS_PORT,
//     host: process.env.RDS_HOSTNAME
//   },
//   migrations: {
//     directory: './migrations',
//     tableName: 'knex_migrations'
//   }
// };

exports.development = {
  client: 'postgresql',
  connection: {
    user: 'johny',
    password: 'peanut',
    host: 'localhost',
    database: 'eatify-crm'
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
};
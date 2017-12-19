const { Client } = require('pg');

const batchDB = new Client({
  user: '',
  host: '',
  database: '',
  password: '',
  port: 3456
});

batchDB.connect();


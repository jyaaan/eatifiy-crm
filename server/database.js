const knex = require('knex')({
  client: 'postgresql',
  connection: {
    user: 'johny',
    password: 'peanut',
    database: 'eatify-crm'
  }
});

function Database() {

}

// QUERY FUNCTIONS

Database.prototype.getUserByUsername = function (username) {
  return new Promise((resolve, reject) => {
    knex('users')
      .select('*')
      .where('username', username)
      .then(result => {
        resolve(result[0]);
      });
  });
}

Database.prototype.usernameExists = function (username) {
  return new Promise((resolve, reject) => {
    knex('users')
      .count('*')
      .where('username', username)
      .then(result => {
        resolve(result[0].count > 0);
      });
  });
}

Database.prototype.getUserByEID = function (id) {
  return new Promise((resolve, reject) => {
    knex('users')
      .select('*')
      .where('id', id)
      .then(result => {
        resolve(result[0]);
      });
  });
}

// MODIFY FUNCTIONS

// USER
Database.prototype.createUser = function (user) {
  const timeNow = new Date(Date.now()).toISOString();
  user.created_at = timeNow;
  user.updated_at = timeNow;

  return knex('users')
    .returning('id')
    .insert(user);
}

Database.prototype.updateUser = function (user) {
  const timeNow = new Date(Date.now()).toISOString();
  user.updated_at = timeNow;

  return knex('users')
    .where('external_id', user.external_id)
    .returning('id')
    .update(user);
}

Database.prototype.upsertUser = function (user) {
  return new Promise((resolve, reject) => {
    knex('users')
      .count('*')
      .where('external_id', user.external_id)
      .then(result => {
        const count = Number(result[0].count);
        if (count > 0) {
          this.updateUser(user)
            .then(updated => {
              resolve(updated);
            })
            .catch(err => {
              console.log('error updating user');
              reject(err);
            });
        } else {
          this.createUser(user)
            .then(created => {
              resolve(created);
            })
            .catch(err => {
              console.log('error creating user');
              reject(err);
            })
        }
      })
  })
}

exports.Database = Database;
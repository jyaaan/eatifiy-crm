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

Database.prototype.getUserByEId = function (eId) {
  return new Promise((resolve, reject) => {
    knex('users')
      .select('*')
      .where('id', eId)
      .then(result => {
        resolve(result[0]);
      });
  });
}

Database.prototype.getEIdFromExternalId = function (externalId, tableName) {
  return knex(tableName)
    .where('external_id', externalId)
    .select('id')
    .limit(1);
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

// RELATIONSHIPS

Database.prototype.createRelationship = function (userEId, followingEId, following) {
  const timeNow = new Date(Date.now()).toISOString();
  const relationship = {
    user_id: userEId,
    following_id: followingEId,
    created_at: timeNow,
    updated_at: timeNow,
    following: following
  };
  return knex('relationships').insert(relationship);
}

Database.prototype.updateRelationship = function (userEId, followingEId, following) {
  const timeNow = new Date(Date.now()).toISOString();
  const relationship = {
    updated_at: timeNow,
    following: following
  };

  return knex('relationships')
    .where('user_id', userEId)
    .andWhere('following_id', followingEId)
    .update(relationship);
}

Database.prototype.upsertRelationship = function (userEId, followingEId, following = true) {
  return new Promise((resolve, reject) => {
    knex('relationships')
      .count('*')
      .where('user_id', userEId)
      .andWhere('following_id', followingEId)
        .then(result => {
          const count = Number(result[0].count);
          if (count > 0) {
            this.updateRelationship(userEId, followingEId, following)
              .then(upsert => {
              })
              .catch(err => {
                console.log('error in upserting>updating relationship');
                reject(err);
              })
          } else {
            this.createRelationship(userEId, followingEId, following)
              .then(create => {

              })
              .catch(err => {
                console.log('error in upserting>creating relationship');
                reject(err);
              })
          }
          resolve('upsert relationship successful');
        })
  })
}

exports.Database = Database;
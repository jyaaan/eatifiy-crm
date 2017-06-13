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

Database.prototype.getFollowing = function (userEId) {
  return knex('relationships')
    .select('following_id')
    .where('user_id', userEId)
    .then(result => {
      return result.map(user => { return user.following_id; });
    })
}

// MODIFY FUNCTIONS

// USERS

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
    .where('username', user.username)
    .returning('id')
    .update(user);
}

Database.prototype.upsertUser = function (user) {
  return new Promise((resolve, reject) => {
    knex('users')
      .count('*')
      .where('username', user.username)
      .then(result => {
        const count = Number(result[0].count);
        if (count > 0) {
          this.updateUser(user)
            .then(updated => {
              resolve(updated[0]);
            })
            .catch(err => {
              console.log('error updating user');
              reject(err);
            });
        } else {
          this.createUser(user)
            .then(created => {
              resolve(created[0]);
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
              .then(update => {
                resolve(update);
              })
              .catch(err => {
                console.log('error in upserting>updating relationship');
                reject(err);
              })
          } else {
            this.createRelationship(userEId, followingEId, following)
              .then(create => {
                resolve(create);
              })
              .catch(err => {
                console.log('error in upserting>creating relationship');
                reject(err);
              })
          }
        })
  })
}

// SUGGESTIONS

Database.prototype.createSuggestion = function (userEId, suggestedEId, rank) {
  const timeNow = new Date(Date.now()).toISOString();
  const suggestion = {
    user_id: userEId,
    suggested_id: suggestedEId,
    created_at: timeNow,
    updated_at: timeNow,
    last_rank: rank,
    highest_rank: rank
  };
  return knex('suggestions').insert(suggestion);
}

Database.prototype.updateSuggestion = function (userEId, suggestedEId, rank, prevRank) {
  const timeNow = new Date(Date.now()).toISOString();
  const suggestion = {
    updated_at: timeNow,
    last_rank: rank,
    highest_rank: (rank < prevRank) ? rank : prevRank
  }
  return knex('suggestions')
    .where('user_id', userEId)
    .andWhere('suggested_id', suggestedEId)
    .update(suggestion);
}

Database.prototype.upsertSuggestion = function (userEId, suggestedEId, rank) {
  return new Promise((resolve, reject) => {
    knex('suggestions')
      .count('*')
      .where('user_id', userEId)
      .andWhere('suggested_id', suggestedEId)
      .then(result => {
        const count = Number(result[0].count);
        if (count > 0) {
          this.getSuggestion(userEId, suggestedEId)
            .then(prevSuggestion => {
              this.updateSuggestion(userEId, suggestedEId, rank, prevSuggestion.highest_rank)
                .then(update => {
                  resolve(update);
                })
                .catch(err => {
                  console.log('error upserting>updating suggestion');
                  reject(err);
                })
            })
        } else {
          this.createSuggestion(userEId, suggestedEId, rank)
            .then(create => {
              resolve(create);
            })
            .catch(err => {
              console.log('error upserting>creating suggestion');
              reject(err);
            })
        }
      })
  })
}

Database.prototype.getSuggestion = function (userEId, suggestedEId) {
  return knex('suggestions')
    .select('*')
    .where('user_id', userEId)
    .andWhere('suggested_id', suggestedEId)
    .then(result => {
      return result[0];
    });
}

Database.prototype.getSuggestionsForUser = function (userEId) {
  return knex('suggestions')
    .select('*')
    .where('user_id', userEId)
    .then(result => {
      return result;
    });
}

// UTILITY

// MASS INSERT
Database.prototype.insertObjects = function (tableName, arrObjData) {
  return knex.transaction((trx) => {
    return knex.batchInsert(tableName, arrObjData)
      .transacting(trx)
      .then(trx.commit)
      .catch(trx.rollback);
  })
    .then(() => {
      console.log('transaction successful')
      return 'transaction successful';
    })
    .catch(() => {
      console.log('transaction failed');
      return 'transaction failed';
    });
}

exports.Database = Database;
const knex = require('knex')({
  client: 'postgresql',
  connection: {
    user: 'postgres',
    password: 'peanut',
    database: 'eatify-crm',
    host: 'localhost',
    port: '5432'
  }
});
// const knex = require('knex')({
//   client: 'postgresql',
//   connection: {
//     user: process.env.RDS_USERNAME,
//     password: process.env.RDS_PASSWORD,
//     database: process.env.RDS_DB_NAME,
//     port: process.env.RDS_PORT,
//     host: process.env.RDS_HOSTNAME
//   }
// });


const async = require('async');
const InfluencerFilter = require('./influencer-filter');

function Database() {

}

function calculateZ(value, avg, std) {
  return (value - avg) / std;
}

function standardDeviation(values){
  return new Promise((resolve, reject) => {
    const avg = average(values);
    const squareDiffs = values.map(function(value){
      var diff = value - avg;
      var sqrDiff = diff * diff;
      return sqrDiff;
    });
    
    var avgSquareDiff = average(squareDiffs);
  
    var stdDev = Math.sqrt(avgSquareDiff);
    resolve({ stdev: stdDev, avg: avg });
  })
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

function GetZPercent(z) {
  //z == number of standard deviations from the mean

  //if z is greater than 6.5 standard deviations from the mean
  //the number of significant digits will be outside of a reasonable 
  //range
  if (z < -6.5)
    return 0;
  if (z > 6.5)
    return 1;

  var factK = 1;
  var sum = 0;
  var term = 1;
  var k = 0;
  var loopStop = Math.exp(-23);
  while (Math.abs(term) > loopStop) {
    term = .3989422804 * Math.pow(-1, k) * Math.pow(z, k) / (2 * k + 1) / Math.pow(2, k) * Math.pow(z, k + 1) / factK;
    sum += term;
    k++;
    factK *= k;

  }
  sum += 0.5;

  return sum * 100;
}


// test functions

Database.prototype.raw = function (query) {
  // console.log('raw query:', query);
  return new Promise((resolve, reject) => {
    knex.raw(query)
      .then(result => {
        resolve(result);
      })
      .catch(err => {
        reject(err);
      })
  })
}

Database.prototype.checkIfDuplicateJob = function(jobObj) {
  return new Promise((resolve, reject) => {
    knex('prospect_jobs')
      .count('*')
      .where('analyzed_username', jobObj.analyzed_username)
      .andWhere('target_list_id', jobObj.target_list_id)
      .andWhere('primary_username', jobObj.primary_username)
      .then(result => {
        resolve(result[0].count > 0);
      })
      .catch(err => {
        reject(err);
      })
  })
}

Database.prototype.getNextQueuedJob = function () {
  return knex('prospect_jobs')
    .select('*')
    .whereNot('stage', 'Refresh')
    .andWhere('queued', true)
    .orderBy('queued_at', 'asc')
    .limit(1)
}

Database.prototype.addJobToQueue = function (jobId) {
  const timeNow = new Date(Date.now()).toISOString();
  return knex('prospect_jobs')
    .where('id', jobId)
    .update({
      queued_at: timeNow,
      updated_at: timeNow,
      queued: true,
      in_progress: false
    })
    .returning('stage')
}

Database.prototype.analyzeLikes = function (min, max) {
  return new Promise((resolve, reject) => {
    knex('users')
    .select('recent_average_likes')
    .where('follower_count', '>', min)
    .andWhere('follower_count', '<=', max)
    .andWhere('recent_average_likes', '>', 0)
    .then(likes => {
      const formattedLikes = likes.map(like => {
        return Number(like.recent_average_likes);
      })
      standardDeviation(formattedLikes)
        .then(stats => {
          resolve(stats);
        })
    })
  })
}

Database.prototype.getThousand = function () {
  // SELECT username, external_id FROM users LIMIT 1000;
  return knex('users')
    .select('username', 'external_id')
    .limit(1000);
}
// QUERY FUNCTIONS

Database.prototype.getBrands = function () {
  return knex('prospects')
    .select('username')
    .where('category', 'B')
}

Database.prototype.getConsumers = function (userEIds) {
  const consumers = [];
  return new Promise((resolve, reject) => {
    async.mapSeries(userEIds, (userId, next) => {
      this.getUserByEId(userId)
        .then(user => {
          if (user.follower_count < 1000 && (user.following_count / user.follower_count) < 3) {
            consumers.push(user);
          }
          next();
        })
    }, err => {
      resolve(consumers);
    })
  })
}

Database.prototype.getInfluencers = function (userEIds, filterParams) {
  const currentFilter = new InfluencerFilter(filterParams);
  const influencers = [];
  return new Promise((resolve, reject) => {
    async.mapSeries(userEIds, (userId, next) => {
      this.getUserByEId(userId)
        .then(user => {
          if (currentFilter.filter(user)) {
            influencers.push(user);
          }
          next();
        })
    }, err => {
      resolve(influencers);
    })
  })
}

Database.prototype.getUsers = function (userEIds) {
  const users = [];
  return new Promise((resolve, reject) => {
    async.mapSeries(userEIds, (userId, next) => {
      this.getUserByEId(userId)
        .then(user => {
          users.push(user);
          next();
        })
    }, err => {
      resolve(users);
    })
  })
}

Database.prototype.clearSuggestionRank = function (userEId) {
  return knex('suggestions')
    .where('user_id', userEId)
    .update('last_rank', null)
    .then(result => {
      return 'done';
    })
}

Database.prototype.getFirst = function (userEId, maxRank) {
  const suggestedUsernames = [];
  return new Promise((resolve, reject) => {
    knex('suggestions')
      .select('suggested_id')
      .where('user_id', userEId)
      .andWhere('last_rank', '<=', maxRank)
      .then(results => {
        var trimmed = results.map(result => {
          return result.suggested_id;
        })
        async.mapSeries(trimmed, (suggestedEId, next) => {
          this.getUsernameFromEId(suggestedEId)
            .then(username => {
              suggestedUsernames.push(username.username);
              next();
            })
        }, err=> {


          resolve(suggestedUsernames);
        })
      })
  })

}

const convertTF = user => {
  return {
    id: user.external_id,
    username: user.username,
    profile_picture: user.picture_url,
    full_name: user.full_name,
    website: user.external_url,
    bio: user.bio,
    counts: {
      media: user.post_count,
      followed_by: user.follower_count,
      follows: user.following_count
    }
  };
}

Database.prototype.getTFFormatUsers = function () {
  return new Promise((resolve, reject) => {
    knex('users')
      .select('*')
      .orderBy('created_at', 'asc')
      .limit(10)
      .then(users => {
        const tfUsers = users.map(user => { return convertTF(user); });
        resolve(tfUsers);
      })
  })
}

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

Database.prototype.getUserByExternalId = function (id) {
  return new Promise((resolve, reject) => {
    knex('users')
      .select('*')
      .where('external_id', id)
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

Database.prototype.getUsernameFromEId = function (userEId) {
  return knex('users')
    .select('username')
    .where('id', userEId)
    .then(result => {
      return result[0];
    })
}

Database.prototype.everScraped = function (username) {
  return knex('users')
    .select('follower_count')
    .where('username', username)
    .then(result => {
      return (result[0].follower_count > 0);
    });
}

Database.prototype.getFollowing = function (userEId) {
  return knex('relationships')
    .select('following_id')
    .where('user_id', userEId)
    .then(result => {
      return result.map(user => { return user.following_id; });
    })
}

Database.prototype.userSuggestionsLoaded = function (username) {
  return new Promise((resolve, reject) => {
    knex('users')
      .count('*')
      .whereNotNull('last_suggested_updated_at')
      .andWhere('username', username)
      .then(result => {
        resolve(result[0].count > 0);
      });
  })
}

// PROSPECTS

Database.prototype.createProspect = function (prospect) {
  const timeNow = new Date(Date.now()).toISOString();
  prospect.created_at = timeNow;
  prospect.updated_at = timeNow;
  if (prospect.external_id && prospect.username && prospect.relationship_type && prospect.prospect_job_id) {
    return knex('prospects')
      .returning('id')
      .insert(prospect);
  } else {
    return 'missing required fields to create prospect';
  }
}

Database.prototype.updateProspect = function (prospect) {
  const timeNow = new Date(Date.now()).toISOString();
  prospect.updated_at = timeNow;

  return knex('prospects')
    .where('username', prospect.username)
    .andWhere('prospect_job_id', prospect.prospect_job_id)
    .returning('id')
    .update(prospect);
}

Database.prototype.upsertProspect = function (prospect) {
  return new Promise((resolve, reject) => {
    this.prospectForJobExists(prospect.prospect_job_id, prospect.username)
      .then(exists => {
        if (exists) {
          this.updateProspect(prospect)
            .then(result => {
              resolve(result[0]);
            })
        } else {
          this.createProspect(prospect)
            .then(result => {
              resolve(result[0]);
            })
        }
      })
      .catch(err => {
        reject(err);
      })
  })
}

Database.prototype.getProspectsByJobId = function (jobId) {
  return knex('prospects')
    .select('*')
    .where('prospect_job_id', jobId)
}

Database.prototype.prospectForJobExists = function (jobId, username) {
  return knex('prospects')
    .count('*')
    .where('prospect_job_id', jobId)
    .andWhere('username', username)
    .then(result => {
      return (result[0].count > 0);
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
  if (user.youngest_post) {
    delete user.youngest_post;
  }
  return new Promise((resolve, reject) => {
    knex('users')
      .count('*')
      .where('external_id', user.external_id)
      .then(result => {
        const count = Number(result[0].count);
        if (count > 0) {
          this.updateUser(user)
            .then(updated => {
              resolve(updated[0]);
            })
            .catch(err => {
              console.error('error updating user');
              reject(err);
            });
        } else {
          this.createUser(user)
            .then(created => {
              resolve(created[0]);
            })
            .catch(err => {
              console.error('error creating user');
              reject(err);
            })
        }
      })
  })
}

Database.prototype.getUsersByJobId = function(jobId, minFollowerCount) {
  const subquery = knex('prospects').select('external_id').where('prospect_job_id', jobId);
  return knex('users')
    .select('*')
    .where('external_id', 'in', subquery)
    .andWhere('follower_count', '>=', minFollowerCount)
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
                console.error('error in upserting>updating relationship');
                reject(err);
              })
          } else {
            this.createRelationship(userEId, followingEId, following)
              .then(create => {
                resolve(create);
              })
              .catch(err => {
                console.error('error in upserting>creating relationship');
                reject(err);
              })
          }
        })
  })
}

// PROSPECT JOBS
/*
Stages:
Initialized - When first created, gathering of likers not yet started
Primed - likers gathered and loaded into prospects table
Pending - prospects converted to csv and sent to TF
Ready - TF signals that prospects have been loaded and ready to be downloaded
Loading - loading process has begun
Loaded - all users have been added to users table and prospects updated with user id.
Refreshing
Complete
*/

Database.prototype.getAllJobs = function () {
  return knex('prospect_jobs')
    .select('*')
    .then(jobs => {
      return jobs;
    })
}

Database.prototype.getJobsByStage = function (stage) {
  return knex('prospect_jobs')
    .select('*')
    .where('stage', stage)
}

Database.prototype.getJobByListId = function (listId) {
  return knex('prospect_jobs')
    .select('*')
    .where('prospect_list_id', listId)
    .then(job => {
      return job[0];
    });
}

Database.prototype.checkJobByListId = function (listId) {
  return knex('prospect_jobs')
    .select('*')
    .where('target_list_id', listId)
    .then(result => {
      return result;
    })
}

Database.prototype.getJobs = function (searchValues) {
  return knex('prospect_jobs')
    .select('*')
    .where(searchValues)
}

Database.prototype.getJobByJobId = function (jobId) {
  return knex('prospect_jobs')
    .select('*')
    .where('id', jobId)
    .then(job => {
      return job[0];
    })
}

Database.prototype.jobExists = function (jobId) {
  return kenx('prospect_jobs')
    .count('*')
    .where('id', jobId)
    .then(jobCount => {
      console.log('jobCount:', jobCount);
    })
}

Database.prototype.createJob = function (job) {
  const timeNow = new Date(Date.now()).toISOString();
  job.created_at = timeNow;
  job.updated_at = timeNow;
  return knex('prospect_jobs')
    .returning('id')
    .insert(job);
}

Database.prototype.updateJob = function (job) {
  const timeNow = new Date(Date.now()).toISOString();
  job.updated_at = timeNow;
  return knex('prospect_jobs')
    .where('id', job.id)
    .returning('id')
    .update(job);
}

Database.prototype.updateJobStage = function (jobId, stage) {
  const job = {
    id: jobId,
    stage: stage
  }
  return this.updateJob(job);
}

Database.prototype.listIdExists = function (listId) {
  return knex('prospect_jobs')
    .count('*')
    .where('prospect_list_id', listId)
    .then(result => {
      return (result[0].count > 0);
    })
}

Database.prototype.resetInProgress = function () {
  const timeNow = new Date(Date.now()).toISOString();
  return knex('prospect_jobs')
    .where('in_progress', true)
    .update({
      in_progress: false,
      queued: true,
      queued_at: timeNow,
      updated_at: timeNow
    });
}

Database.prototype.removeAllQueued = function () {
  const timeNow = new Date(Date.now()).toISOString();
  return knex('prospect_jobs')
    .where('queued', true)
    .update({
      queued: false,
      updated_at: timeNow
    });
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
                  console.error('error upserting>updating suggestion');
                  reject(err);
                })
            })
        } else {
          this.createSuggestion(userEId, suggestedEId, rank)
            .then(create => {
              resolve(create);
            })
            .catch(err => {
              console.error('error upserting>creating suggestion');
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
      console.error('transaction failed');
      return 'transaction failed';
    });
}

exports.Database = Database;
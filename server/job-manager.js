/*
OLD
Stages:
Initialized
Gathering
Sending Candidates
Awaiting Refresh
Downloading
Awaiting Distill
Distilling
Sending Prospects
Complete
*/

/*
NEW
Stages:
Initialized
Gathering
Awaiting Scrape
Scraping
Awaiting Media Pull
Pulling Media
Awaiting Transfer
Transferring
Complete
*/

const async = require('async');

class JobManager {

  constructor(database) {
    this.database = database;
    this.available = true;
  }

  // run when initialized. intended to cover any jobs interrupted by a reset
  // will move all in-progress jobs into queue.
  resetInProgress() {
    this.database.resetInProgress()
      .then(result => {
        // done
      })
  }

  // removes all queued jobs
  // to be used to prepare for planned reset or shutdown
  removeAllQueued() {
    this.database.removeAllQueued()
      .then(result => {
        // done
      })
  }

  getRefreshJobs() {
    return new Promise((resolve, reject) => {
      this.database.getJobs({
        queued: true,
        stage: 'Awaiting Refresh',
        in_progress: false
      })
        .then(jobs => {
          async.mapSeries(jobs, (job, next) => {
            const jobUpdate = {
              id: job.id,
              in_progress: true,
              queued: false
            }
            this.database.updateJob(jobUpdate)
              .then(updated => {
                next();
              })
              .catch(err => {
                console.error(err);
                next();
              })
          }, err => {
            resolve(jobs);
          })
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  getQueuedJobs() {
    return new Promise((resolve, reject) => {
      this.database.getJobs({
        queued: true,
        in_progress: false
      })
        .then(jobs => {
          resolve(jobs);
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  createJob(job) {
    return new Promise((resolve, reject) => {
      this.checkIfDuplicateJob(job)
        .then(duplicate => {
          if (!duplicate) {
            console.log('adding job');
            this.database.createJob(job)
              .then(result => {
                resolve(result[0]);
              })
              .catch(err => {
                console.error('error when attempting to create new job');
                console.error(err);
                reject(err);
              })
          } else {
            reject('duplicate job found');
          }
        })
    })
  }

  updateJob(job) {
    return new Promise((resolve, reject) => {
      console.log('updating job');
      this.database.updateJob(job)
        .then(result => {
          resolve(result[0]);
        })
        .catch(err => {
          console.error('error when attempting to create new job');
          reject(err);
        })
    })
  }

  getQueuedRefreshJobs() {
    return new Promise((resolve, reject) => {
      this.database.getJobs({
        queued: true,
        stage: 'Refresh'
      })
        .then(newRefreshJobs => {
          resolve(newRefreshJobs);
        })
    })
  }

  getNextQueuedJob() {
    return new Promise((resolve, reject) => {
      this.database.getNextQueuedJob()
        .then(job => {
          resolve(job);
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  checkIfActive(jobId) {
    return new Promise((resolve, reject) => {
      this.database.getJobByJobId(jobId)
        .then(job => {
          resolve(job.in_progress)
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  getJobMembers(jobId) {
    return new Promise((resolve, reject) => {
      this.database.getUsersByJobId(jobId)
        .then(users => {
          this.database.getUsers(users)
            .then(members => {
              resolve(members);
            })
        })
    })
  }

  // { primary_username, analyzed_username, target_list_id}
  // return boolean
  checkIfDuplicateJob(jobObj) {
    return new Promise((resolve, reject) => {
      this.database.checkIfDuplicateJob(jobObj)
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  queueJob(jobId) {
    return new Promise((resolve, reject) => {
      this.database.addJobToQueue(jobId)
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  // checks if target list id exists
  getJobByListId(listId) {
    return new Promise((resolve, reject) => {
      this.database.checkJobByListId(listId)
        .then(exists => {
          resolve(exists);
        })
    })
  }
}

module.exports = JobManager;
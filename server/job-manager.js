/*
Stages:
Initialized
Gather
Send Users
Refresh Check
Download
Distill
Send Prospects
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
    })
  }

  createJob(jobParams) {
    return new Promise((resolve, reject) => {
      console.log('adding job');
      const job = {};
      job.prospect_list_id = jobParams.prospect_list_id;
      job.token = jobParams.token;
      job.primary_username = jobParams.primary_username;
      job.analyzed_username = jobParams.analyzed_username;
      job.stage = 'Initialized';
      job.filter_params = JSON.stringify({});
  
      this.database.createJob(job)
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          console.error('error when attempting to create new job');
          console.error(err);
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
          console.log(newRefreshJobs);
          resolve(newRefreshJobs);
        })
    })
  }
}

module.exports = JobManager;
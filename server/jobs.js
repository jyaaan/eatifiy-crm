const createJob = (id) => {
  return {
    id: id,
    active: false,
    in_progress: false,
    jobId: null,
    job: {}
  }
}

class Jobs {
  constructor(jobCount = 2) {
    this.jobs = [];
    for (let i = 0; i < jobCount; i++) {
      this.jobs.push(createJob(i + 1));
    }
  }

  jobAvailable() {
    return this.jobs.some(job => {
      return job.active === false;
    });
  }

  getAvailableJob() {
    return this.jobs.find(job => {
      return job.active === false;
    });
  }

  pending() {
    return this.jobs.some(job => {
      return job.active === true && job.in_progress === false;
    })
  }

  getPending() {
    return this.jobs.filter(job => {
      return (job.active === true && job.in_progress === false);
    })
  }
}

var jobTest = new Jobs();


module.exports = Jobs;
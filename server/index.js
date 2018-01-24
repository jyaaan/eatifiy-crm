const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');
const Database = require('./database').Database;
const database = new Database();
const ParseScrape = require('./parse-scrape');
const Scraper = require('./scraper');
// const ScrapeSave = require('./scrape-save');
// const scrapeSave = new ScrapeSave();
const ScraperMedia = require('./scraper-media');
const async = require('async');
const fs = require('fs');
const request = require('request');
const FileHandler = require('./file-controller');
const fileHandler = new FileHandler();
const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };
const Prospect = require('./prospect');
const prospect = new Prospect();

const Messaging = require('./messaging');
const messaging = new Messaging();

const TFBridge = require('./tf-bridge');
const tfBridge = new TFBridge();

const http = require('http').createServer(app);

app.use(staticMiddleware);
app.use(bodyParser.json());

// select id, username, 

const JobManager = require('./job-manager');
const jobManager = new JobManager(database);

// Initialization routines and parameters
jobManager.resetInProgress();
const MAXPOSTCOUNT = 1200;
var refreshJobs = [];
var refreshJobURLs = [];

// Recurring jobs starting a minute after initialization
var schedule = require('node-schedule');
var recurringJob5;
var recurringJob1;
var recurringJob1Staggered;

const activeJob = {
  active: false,
  in_progress: false,
  jobId: null,
  job: {}
}

const resetJob = job => {

}
// SELECT id, primary_username, analyzed_username, stage, queued, in_progress, prospect_count as count from prospect_jobs order by id desc limit 20;
setTimeout(() => {
  // delayed jobs
  refreshJobs = Object.assign(refreshJobs, jobManager.getRefreshJobs());

  // Every 5 minutes
  recurringJob5 = schedule.scheduleJob('*/5 * * * *', () => {
  });
  
  // Every 1 minute
  recurringJob1 = schedule.scheduleJob('*/1 * * * *', () => {
    jobManager.getQueuedJobs()
      .then(jobs => {
        console.log('new refresh jobs: ' + jobs.map(job => { return job.id }));
        if (jobs[0] && !activeJob.active) {
          activeJob.jobId = jobs[0].id;
          activeJob.job = jobs[0]
          activeJob.active = true;
          const jobUpdate = {
            id: activeJob.jobId,
            in_progress: true
          };
          jobManager.updateJob(jobUpdate)
            .then(result => {
              console.log('current job:', activeJob);
            })
        } else {
          // check if active job is in progress.
          if (activeJob.jobId) {
            jobManager.checkIfActive(activeJob.jobId)
            // jobManager.checkIfActive(126)
              .then(isActive => {
                if (isActive) {
                  console.log('jobs full');
                } else {
                  activeJob.active = false;
                  activeJob.in_progress = false;
                  activeJob.jobId = null;
                  console.log('job is no longer in progress, loading next');
                }
              })
          } else {
            // no active job, check should not run.
          }
          // console.log(activeJob);
        }
      })
    
    // parseListDetails(job);
    // const verifyURL = getDownloadURL(listDetails);
    // var checkJob = setInterval(checkIfRefreshed, 60000);
    // function checkIfRefreshed() {
      //   tfBridge.verifyList(verifyURL)
      //     .then(verified => {
        //       if (verified) {
    //         console.log('refresh complete, killing recurring job and initializing download');
    //         clearInterval(checkJob);
    //         console.log('downloading in progress');
    //         tfBridge.downloadProspects(downloadURL, listDetails.prospect_job_id)
    //           .then(returnObj => {
      //             messaging.send(returnObj.count + ' users downloaded in ' + returnObj.duration + ' seconds for jobId: ' + listDetails.prospect_job_id);
    //           });
    //       } else {
      //         console.log('refresh not complete, retrying in 60 seconds');
    //       }
    //     })
    // }
  });
  
  // Every 1 minute stagger 30 test
  recurringJob1Staggered = schedule.scheduleJob('30 * * * * *', () => {
    // assume we have urls
    // async.mapSeries(refreshJobURLs, (refreshURL, next) => {
    //   tfBridge.verifyList(refreshURL)
    //     .then(verified => {
    //       if (verified) {
    //         // update job and remove this from job.
    //       }
    //     })
    // })
    if (activeJob.active && !activeJob.in_progress) {
      console.log('we gotta start the job!');
      activeJob.in_progress = true;
      // set job to in progress, unqueue
      const jobUpdate = {
        id: activeJob.jobId,
        in_progress: true,
        queued: false,
        stage: 'Gathering'
      };
      jobManager.updateJob(jobUpdate)
        .then(result => {
          startProspectJob(activeJob.jobId);
        })
    } else {
      console.log('no action will be taken:');
    }
  })
}, 30000);

const BatchDB = require('./batch_db');
const batchDB = new BatchDB();

app.get('/test-refresh-jobs', (req, res) => {
  jobManager.getQueuedRefreshJobs()
    .then(jobs => {
      res.json(jobs);
    })
})

app.get('/test-add-job-to-queue/:jobId', (req, res) => {
  jobManager.queueJob(req.params.jobId)
    .then(result => {
      res.send(result);
    })
})

app.get('/test-get-next-queued-job', (req, res) => {
  jobManager.getNextQueuedJob()
    .then(job => {
      res.json(job);
    })
})

//test generic job search functions

app.get('/test-scoring', (req, res) => {
  database.analyzeLikes(50000, 100000)
    .then(analysisObj => {
      console.log('analysis result', analysisObj);
      res.send('200');
    })
})

app.get('/test-method/:argument', (req, res) => {
  prospect.processJob(req.params.argument);

})
/*
{
prospect_list: {
id: 1761,
created_at: "2017-12-09T17:20:09.494-08:00",
updated_at: "2018-01-22T18:14:58.175-08:00",
user_id: 189,
settings: {
terms: { },
prospect_count: "300",
candidate_count: "1000",
reference_brands: [ ],
instagram_username: "eatifyjohn",
upload_url: "https://app.truefluence.io/users/lovepopcards/lists/1761.json"
},
approved: true,
token: "9FCzXHzdfhwBWpTi2xiv2KZQ",
count: 49,
refreshed_at: "2018-01-23T14:14:23.531-08:00",
message: "",
name: "Lovepop Line Campaign (Larger Influencers)",
notes: "wedding line. higher followers",
indexed_at: "2018-01-22T18:14:58.129-08:00",
began_indexing_at: null,
can_download: true,
can_import: null,
can_delete_shown: null,
can_request_campaign: true,
refreshing: false
},
}

*/
app.post('/gather', (req, res) => {
  console.log('gather request');
  analyzed_username = req.body.reference_brands[0] ? req.body.reference_brands[0] : req.body.username;
  const newJob = {
    upload_url: req.body.upload_url,
    primary_username: req.body.username,
    analyzed_username: req.body.reference_brands[0] ? req.body.reference_brands[0] : req.body.username,
    stage: 'Initialized',
    queued: false
  };
  // console.log(newJob);
  jobManager.createJob(newJob)
    .then(jobId => {
      tfBridge.createProspectList(newJob.primary_username + ':' + newJob.analyzed_username, 'LXJrk8BevkpMvGoNUA4SR3L1-u')
        .then(newList => {
          newList.id = jobId;
          newList.queued = true;
          database.updateJob(newList)
            .then(updated => {
              console.log(newList);
              res.send('list and job created successfully');
              // should result in job queued 
            })
        })
        .catch(err => {
          console.error(err);
          res.send(err);
        })
    })
})

app.put('/distill', (req, res) => {
  console.log('distill request');
  console.log(req.body);
  res.send('received');
});


getValue = (url, value, terminus = '/') => {
  if (url.indexOf(value) > 0) {
    const startPos = url.indexOf(value) + value.length;
    const endPos = url.indexOf(terminus, startPos) > 0 ? url.indexOf(terminus, startPos) : url.length;
    return url.substring(startPos, endPos);
  } else {
    return -1;
  }
}

getDownloadURL = listDetails => {
  // var downloadURL = 'https://' + (listDetails.staging ? 'staging.' : 'app.') + 'truefluence.io/users/';
  var downloadURL = 'https://app.truefluence.io/users/';
  downloadURL = downloadURL + listDetails.username + '/prospects/' + listDetails.listId + '.json?token=';
  downloadURL = downloadURL + listDetails.token;
  return downloadURL;
}

/*
return:
{
prospect_list_id: 1637,
token: "xWNVzMMFcbA5YyVSQiWyMpt5"
}
*/
app.get('/test-create-prospect-list/:username', (req, res) => {
  tfBridge.createProspectList(req.params.username, 'LXJrk8BevkpMvGoNUA4SR3L1-u') // save to env var
    .then(result => {
      res.send(result);
    })
})
// add returned object here

app.get('/list-jobs/:stage', (req, res) => {
  console.log('list jobs:', req.params.stage);
  // if stage is all, get all jobs and return
  if (req.params.stage == 'all') {
    database.getAllJobs()
      .then(jobs => {
        res.send(jobs);
      })
  } else {
    console.log('not all');
    // otherwise, get jobs of specific stage
    database.getJobsByStage(req.params.stage)
      .then(jobs => {
        if (jobs.length > 0) {
          res.send(jobs);
        } else {
          res.send('No jobs found.');
        }
      })
  }
})

app.get('/verify-list/:jobId', (req, res) => {
  database.getJobByJobId(req.params.jobId)
    .then(job => {
      const listDetails = parseListDetails(job);
      const downloadURL = getVerifyURL(listDetails);
      console.log('trying:', downloadURL);
      tfBridge.verifyList(downloadURL)
        .then(verified => {
          console.log(verified);
          let message = 'list is' + ' ' + (verified ? '' : 'not') + ' ' + 'complete.';
          res.send(message);
        })
    })
    .catch(err => {
      console.error(err);
      res.send(err);
    })
})

const parseListDetails = job => {
  return {
    loaded: true,
    staging: true,
    token: job.token,
    username: job.primary_username,
    analyzed_username: job.analyzed_username,
    listId: job.prospect_list_id,
    prospect_job_id: job.id
  }
}

// when pushign verythign to production, make sure you change this.
const getVerifyURL = listDetails => {
  var verifyURL = 'https://app.truefluence.io/users/truefluence9/';
  verifyURL = verifyURL + 'lists/' + listDetails.listId + '.json?token=';
  verifyURL = verifyURL + listDetails.token;
  return verifyURL;
}

const getSubmitURL = listDetails => {
  // var submitURL = 'https://' + (listDetails.staging ? 'staging.' : 'app.') + 'truefluence.io/users/';
  var submitURL = 'https://app.truefluence.io/users/truefluence9';
  submitURL = submitURL + '/prospects/' + listDetails.listId + '.csv?token=';
  submitURL = submitURL + listDetails.token;
  return submitURL;
}

app.post('/test-filter-parameters', (req, res) => {
  res.send('ok');
  console.log(req.body);
  const job = {
    filter_params: 'test',
    id: req.body.job_id
  }
  console.log(job);
  prospect.getProspects(req.body.job_id, req.body.filter_params, req.body.return_amount)
    .then(result => {
      console.log('index: ', result);
    })
})

app.get('/health_ping', (req, res) => {
  res.send('OK'); 
})

app.get('/list-details', (req, res) => {
  console.log('getting list details');
  if (listDetails.loaded) {
    res.send(listDetails.listId);
  } else {
    res.send('-1');
  }
})

app.post('/create-list', (req, res) => {

})

app.get('/delete-list', (req, res) => {

})

app.post('/create-job', (req, res) => {
  database.listIdExists(req.body.prospect_list_id)
    .then(exists => {
      if (!exists) {
        console.log('doesn\'t exist, adding');
        const job = {};
        job.prospect_list_id = req.body.prospect_list_id;
        job.token = req.body.token;
        job.primary_username = req.body.primary_username;
        job.analyzed_username = req.body.analyzed_username;
        job.stage = 'initialized';
        job.filter_params = JSON.stringify({});
  
        database.createJob(job)
          .then(result => {
            res.send(result);
          })

      } else {
        res.send('list id already exists!');
      }
    })
})

const startProspectJob = jobId => {
  database.getJobByJobId(jobId)
  .then(job => {
    const listDetails = parseListDetails(job);
    var prospectCount = 0;
    if (listDetails.loaded) {
      if (job.list_sent) {
        if (job.ready_to_download) {
          console.log('ready to download!');
        } else {
          console.log('prospect list previously submitted for enrichment, please wait');
        }
      } else {
        console.log('this job be ready to rock and roll!');
        prospect.batchLikers(job.analyzed_username, listDetails.prospect_job_id, MAXPOSTCOUNT)
          .then(likers => {
            console.log('likers found:', likers.length);
            console.log(job.id);
            const submitURL = getSubmitURL(listDetails);
            const downloadURL = getDownloadURL(listDetails);
            console.log(submitURL);
            renderFormattedProspects(listDetails.prospect_job_id)
              .then(prospects => {
                prospectCount = prospects.length;
                batchProspects(prospects).map(batch => {
                  setTimeout(() => {
                    tfBridge.submitProspects(submitURL, batch);
                  }, 500);
                })
                messaging.send('gathering finished for:' + listDetails.username);
                const jobUpdate = {
                  id: jobId,
                  in_progress: false,
                  stage: 'Awaiting Refresh'
                };
                jobManager.updateJob(jobUpdate)
                  .then(result => {
                    console.log(jobId + ' - in_progress set to false');
                  })
                return('baddd');
              })
              .then(result => {
                const updateJob = {
                  id: listDetails.prospect_job_id,
                  list_sent: true,
                  prospect_count: prospectCount
                }
                console.log('update job:', updateJob);
                database.updateJob(updateJob)
                  .then(done => {
                    return('holla!');
                    // res.end();
                    // confirmed that update occurs
                    // start checking every minute to see if list is finished
                    // var checkJob = setInterval(checkIfRefreshed, 60000);
                    // function checkIfRefreshed() {
                    //   tfBridge.verifyList(downloadURL)
                    //     .then(verified => {
                    //       if (verified) {
                    //         console.log('refresh complete, killing recurring job and initializing download');
                    //         clearInterval(checkJob);
                    //         res.send('downloading in progress');
                    //         tfBridge.downloadProspects(downloadURL, listDetails.prospect_job_id)
                    //           .then(returnObj => {
                    //             messaging.send(returnObj.count + ' users downloaded in ' + returnObj.duration + ' seconds for jobId: ' + listDetails.prospect_job_id);
                    //           });
                    //       } else {
                    //         console.log('refresh not complete, retrying in 60 seconds');
                    //       }
                    //     })
                    // }
                  })
              })
          })
          .then(thing => {
            if (thing = 'holla!') {
              const verifyURL = getVerifyURL(listDetails);
              const downloadURL = getDownloadURL(listDetails);
              console.log('starting checking routing');
              setTimeout(() => {
                var checkJob = setInterval(checkIfRefreshed, 60000);
                function checkIfRefreshed() {
                  tfBridge.verifyList(verifyURL)
                    .then(refreshing => {
                      if (!refreshing) {
                        console.log('refresh complete, killing recurring job and initializing download');
                        clearInterval(checkJob);
                        console.log('downloading in progress');
                        tfBridge.downloadProspects(downloadURL, listDetails.prospect_job_id)
                          .then(returnObj => {
                            messaging.send(returnObj.count + ' users downloaded in ' + returnObj.duration + ' seconds for jobId: ' + listDetails.prospect_job_id);
                          });
                      } else {
                        console.log('refresh not complete, retrying in 60 seconds');
                      }
                    })
                }
              }, 60000);
            } else {
              console.log('no holla');
            }
          })
          .catch(err => {
            console.log('batchLikers failure');
            console.error(err);
  
          })
      }
    } else {
      console.log('prospect job with id:' + jobId + ' does not exist');
    }
  })
}

const startProspectJob2 = jobId => {
  database.getJobByJobId(req.params.jobId)
    .then(job => {
      const listDetails = parseListDetails(job);
      var prospectCount = 0;
      if (listDetails.loaded) {
        if (job.list_sent) {
          if (job.ready_to_download) {
            res.send('ready to download!');
          } else {
            res.send('prospect list previously submitted for enrichment, please wait');
          }
        } else {
          res.send('this job be ready to rock and roll!');
          prospect.batchLikers(job.analyzed_username, listDetails.prospect_job_id, MAXPOSTCOUNT)
            .then(likers => {
              console.log('likers found:', likers.length);
              messaging.send(likers.length + ' likers saved to prospects, sending to Truefluence');
              const submitURL = getSubmitURL(listDetails);
              console.log(submitURL);
              renderFormattedProspects(listDetails.prospect_job_id)
                .then(prospects => {
                  prospectCount = prospects.length;
                  batchProspects(prospects).map(batch => {
                    setTimeout(() => {
                      tfBridge.submitProspects(submitURL, batch);
                    }, 500);
                  })
                })
                .then(result => {
                  const updateJob = {
                    id: listDetails.prospect_job_id,
                    list_sent: true,
                    prospect_count: prospectCount
                  }
                  console.log('update job:', updateJob);
                  database.updateJob(updateJob)
                    .then(done => {
                      // confirmed that update occurs
                      // start checking every minute to see if list is finished
                    })
                })
            })
            .catch(err => {
              console.log('batchLikers failure');
              console.error(err);
            })
        }
      } else {
        console.log('prospect job with id:' + req.params.jobId + ' does not exist');
      }
    })
    .catch(err => {
      console.error(err);
    })
}

app.get('/initiate-prospect-job/:jobId', (req, res) => {
  database.getJobByJobId(req.params.jobId)
    .then(job => {
      const listDetails = parseListDetails(job);
      console.log(job);
      // console.log(listDetails);
      var prospectCount = 0;
      if (listDetails.loaded) {
        if (job.list_sent) {
          if (job.ready_to_download) {
            res.send('ready to download!');
          } else {
            res.send('prospect list previously submitted for enrichment, please wait');
          }
        } else {
          res.send('this job be ready to rock and roll!');
          prospect.batchLikers(job.analyzed_username, listDetails.prospect_job_id, MAXPOSTCOUNT)
            .then(likers => {
              console.log('likers found:', likers.length);
              console.log(job.id);
              const submitURL = getSubmitURL(listDetails);
              const downloadURL = getDownloadURL(listDetails);
              console.log(submitURL);
              renderFormattedProspects(listDetails.prospect_job_id)
                .then(prospects => {
                  prospectCount = prospects.length;
                  batchProspects(prospects).map(batch => {
                    setTimeout(() => {
                      tfBridge.submitProspects(submitURL, batch);
                    }, 500);
                  })
                  return('baddd');
                })
                .then(result => {
                  const updateJob = {
                    id: listDetails.prospect_job_id,
                    list_sent: true,
                    prospect_count: prospectCount
                  }
                  console.log('update job:', updateJob);
                  database.updateJob(updateJob)
                    .then(done => {
                      return('holla!');
                      // res.end();
                      // confirmed that update occurs
                      // start checking every minute to see if list is finished
                      // var checkJob = setInterval(checkIfRefreshed, 60000);
                      // function checkIfRefreshed() {
                      //   tfBridge.verifyList(downloadURL)
                      //     .then(verified => {
                      //       if (verified) {
                      //         console.log('refresh complete, killing recurring job and initializing download');
                      //         clearInterval(checkJob);
                      //         res.send('downloading in progress');
                      //         tfBridge.downloadProspects(downloadURL, listDetails.prospect_job_id)
                      //           .then(returnObj => {
                      //             messaging.send(returnObj.count + ' users downloaded in ' + returnObj.duration + ' seconds for jobId: ' + listDetails.prospect_job_id);
                      //           });
                      //       } else {
                      //         console.log('refresh not complete, retrying in 60 seconds');
                      //       }
                      //     })
                      // }
                    })
                })
            })
            .then(thing => {
              if (thing = 'holla!') {
                const verifyURL = getVerifyURL(listDetails);
                const downloadURL = getDownloadURL(listDetails);
                console.log('starting checking routing');
                setTimeout(() => {
                  var checkJob = setInterval(checkIfRefreshed, 60000);
                  function checkIfRefreshed() {
                    tfBridge.verifyList(verifyURL)
                      .then(refreshing => {
                        if (!refreshing) {
                          console.log('refresh complete, killing recurring job and initializing download');
                          clearInterval(checkJob);
                          console.log('downloading in progress');
                          tfBridge.downloadProspects(downloadURL, listDetails.prospect_job_id)
                            .then(returnObj => {
                              messaging.send(returnObj.count + ' users downloaded in ' + returnObj.duration + ' seconds for jobId: ' + listDetails.prospect_job_id);
                            });
                        } else {
                          console.log('refresh not complete, retrying in 60 seconds');
                        }
                      })
                  }
                }, 60000);
              } else {
                console.log('no holla');
              }
            })
            .catch(err => {
              console.log('batchLikers failure');
              console.error(err);
    
            })
        }
      } else {
        console.log('prospect job with id:' + req.params.jobId + ' does not exist');
      }
    })
})

app.get('/test-batch-download-prospects/:jobId', (req, res) => {
  database.getJobByJobId(req.params.jobId)
    .then(job => {
      const listDetails = parseListDetails(job);
      const downloadURL = getDownloadURL(listDetails);
      console.log(downloadURL);
      res.send('downloading in progress');
      tfBridge.downloadProspects(downloadURL, listDetails.prospect_job_id)
        .then(returnObj => {
          // messaging.send(returnObj);
          messaging.send(returnObj.count + ' users downloaded in ' + returnObj.duration + ' seconds for jobId: ' + listDetails.prospect_job_id);
        });
    })
})

app.get('/test-get-user-list', (req, res) => {
  const listURL = 'https://staging.truefluence.io/users/lawrencehunt_co/lists.json';
  tfBridge.downloadProspects(listURL);
  res.send('received');
})

app.get('/test-render-send-prospects/:jobId', (req, res) => {
  res.send('ok');
  database.getJobByJobId(req.params.jobId)
    .then(job => {
      var prospectCount = 0;
      const listDetails = parseListDetails(job);
      if (listDetails.loaded) {
        const submitURL = getSubmitURL(listDetails);
        console.log(submitURL);
        renderFormattedProspects(listDetails.prospect_job_id) 
          .then(prospects => {
            prospectCount = prospects.length;
            batchProspects(prospects).map(batch => {
              setTimeout(() => {
                tfBridge.submitProspects(submitURL, batch);
              }, 500);
            })
          })
          .then(result => {
            const updateJob = {
              id: listDetails.prospect_job_id,
              list_sent: true,
              prospect_count: prospectCount
            }
            database.updateJob(updateJob)
              .then(done => {
                // confirmed that update occurs
              })
          })
      } else {
        res.send('error: target prospect list not specified');
      }
    })
})

batchProspects = (prospects, batchSize = 1000) => {
  return prospects.map((prospect, i) => {
    return i%batchSize === 0 ? prospects.slice(i, i + batchSize) : null;
  }).filter(elem => { return elem; });
}

renderFormattedProspects = jobId => {
  return new Promise((resolve, reject) => {
    database.getProspectsByJobId(jobId)
      .then(prospects => {
        const formattedProspects = prospects.map(prospect => {
          return [prospect.username, prospect.external_id];
        })
        resolve(formattedProspects);
      })
  })
}

// https://staging.truefluence.io/users/eatify/prospects/1013.json?token=oiUBxMQ9KzvBezCyGX1gLDMS&per_page=2&page=5
app.post('/prospect', (req, res) => {
  // get the url
  const url = req.body.upload_url;
  console.log(url);
  listDetails.staging = url.indexOf('/staging.') > 0;
  listDetails.token = getValue(url, 'token=', '&');
  listDetails.username = getValue(url, 'users/');
  listDetails.listId = getValue(url, 'prospects/', '.');
  listDetails.loaded = true;
  console.log(listDetails)
  res.send(listDetails);
})

app.get('/submit-list', (req, res) => {
  if (listDetails.loaded) {
    console.log(submitURL);
    const submitURL = getSubmitURL(listDetails);
    tfBridge.submitProspects(submitURL);
    res.send('list created');
  } else {
    res.send('error: target prospect list not specified');
  }
})

app.get('/test-follower-submit/:userId', (req, res) => {
  
  const submitURL = getSubmitURL(listDetails);
  prospect.getFollowers(req.params.userId)
    .then(result => {
      const followers = result.map(follower => { return [follower.username, follower.id]; }) 
      res.send(followers);
      // tfBridge.submitProspects(submitURL, followers);
    })
})

app.get('/download-list', (req, res) => {
  if (listDetails.loaded) {
    const downloadURL = getDownloadURL(listDetails);
    tfBridge.downloadProspects(downloadURL);
    console.log(downloadURL);
    res.send('downloaded');
  } else {
    res.send('error: target prospect list not specified');
  }
})

app.post('/preload', (req, res) => {
  console.log('preloading');
  res.json('preloading');
  prospect.likers('jesterrulz', req.body, 100, 100);
});

app.put('/test-url', (req, res) => {
  console.log('test-url received');
  console.log('csv contents:', req.body);
  res.send('thanks');
})

const signal = (csvFile, url) => {
  var options = {
    url: url,
    method: 'PUT',
    headers: [
      {
      name: 'Content-Type',
      value: 'application/csv'
      }
    ],
    body: csvFile
  };
  request(options);
}

app.post('/ui-analyze', (req, res) => {
  res.send('request received');
  console.log('type:', req.body.type);
  console.log('parameters:', req.body.parameters);
  const params = {
    username: req.body.type.username,
    days: req.body.type.days
  };
  const filterParams = req.body.parameters;
  prospect.likers(params, filterParams);
})

app.get('/brands', (req, res) => {
  console.log('exporting brands');
  database.getBrands()
    .then(brands => {
      // console.log(brands);
      res.json(brands);
    })
})

app.get('/prospect-list/:primaryUsername', (req, res) => {
  console.log('trying to get prospects of:', req.params.primaryUsername);
  database.getProspects(req.params.primaryUsername)
    .then(prospects => {
      res.json(prospects);
    })
})

app.post('/update-prospect', (req, res) => {
  console.log('attempting to update:', req.body.id, 'params:', req.body.params);
  const id = req.body.id;
  database.updateProspect(id, req.body.params)
    .then(result => {
      res.send('clear');
      console.log('prospect updated');
    })
})

app.get('/load-user/:username', (req, res) => {
  loadUser(req.params.username)
    .then(slug => {
      res.json(slug);
    })
})

const loadUser = (username) => { // now with more resume-ability!
  console.log('loading', username);
  return new Promise((resolve, reject) => {
    ScraperMedia(username)
      .then(slug => {
        resolve(slug);
      })
      .catch(err => {
        console.log('ScraperMedia error');
        reject(err);
      })
  });
}

function spliceDuplicates(users) {
  return users.filter((user, index, collection) => {
    return collection.indexOf(user) == index;
  })
}

app.post('/preload-prospects', (req, res) => {
  console.log('loading prospects');
  const usernames = req.body.usernames;
  const primaryUsername = req.body.primaryUsername;
  async.mapSeries(usernames, (username, next) => {
    database.createProspect(primaryUsername, username)
      .then(result => {
        next();
      })
      .catch(err => {
        console.error(err);
        next();
      })
  }, err => {
    res.send(200, 'loaded');
  });
})

app.post('/enrich', (req, res) => {
  console.log('starting enrich process');
  const usernames = req.body;
  const userIds = [];
  var counter = 0;
  async.mapSeries(usernames, (user, followup) => {
    counter++;
    console.log((counter / usernames.length * 100).toFixed(2));
    scrapeSave(user)
      .then(profile => {
        userIds.push(profile.id);
        followup();
      })
      .catch(err => { // light-weight error handling. not very effective. read up on try/catch and implement further upstream
        console.log('error detected, trying again...');
        console.error(err);
        scrapeSave(user)
          .then(userIds => {
            console.log('second attempt successful');
            userrIds.push(userIds.id);
            followup();
          })
          .catch(err => {
            console.log('second error, continuing');
            followup();
          })
      })
  }, err => {
    database.getUsers(userIds)
      .then(influencers => {
        const headers = ['id', 'externalId', 'username', 'postCount', 'followerCount', 'followingCount', 'following/follower ratio', 'recentPostCount', 'recentAvLikes', 'recentAvComments', 'engagementRatio', 'postFrequency(Hr)', 'website'];
        var influencerData = influencers.map(influencer => { // refactor this mess
          return influencer.id + ',' + influencer.external_id + ',' + influencer.username + ',' + influencer.post_count + ',' + influencer.follower_count + ',' +
            influencer.following_count + ',' + (influencer.following_count / influencer.follower_count) + ',' + influencer.recent_post_count + ',' + (influencer.recent_like_count / influencer.recent_post_count) + ',' +
            (influencer.recent_comment_count / influencer.recent_post_count) + ',' + (influencer.recent_like_count / influencer.recent_post_count) / influencer.follower_count + ',' + ((influencer.recent_post_duration / 3600) / influencer.recent_post_count) + ',' +
            influencer.external_url;
        });
        fileHandler.writeToCSV(influencerData, 'csv-enrich-data', headers)
          .then(result => {
          })
      })
      .catch(err => {
        console.log('getUsers failure');
        console.error(err);
      })
  });
})

const scrapeSave = (username, bypass = false) => { // now with more resume-ability!
  username = username.trim();
  console.log('scraping', username);
  var thisId;
  return new Promise((resolve, reject) => {
    database.getUserByUsername(username)
      .then(user => {
        // console.log('user:', user);
        if (!user || bypass || user.recent_like_count == 0 || user.recent_like_count == null) {
          Scraper(username)
            .then(user => {
              database.upsertUser(user)
                .then(result => {
                  database.getEIdFromExternalId(user.external_id, 'users')
                    .then(id => {
                      resolve({ id: id[0].id, external_id: user.external_id });
                    })
                })
                .catch(err => {
                  console.log('upsert attempt failure');
                  reject(err);
                })
            })
            .catch(err => {
              console.log('scraper failure');
              reject(err);
            })
        } else {
          console.log('skipping');
          resolve({ id: user.id, external_id: user.external_id });
        }
      })
      .catch(err => {
        console.log('get user by username failure');
        reject(err);
      })
  });
}

app.get('/mentions/:username/:mention', (req, res) => {
  const focusUsername = req.params.username;
  const lookup = req.params.mention.toLowerCase();
  var mentionCount = 0;
  var tagCount = 0;
  res.send('mention analysis for ' + focusUsername);
  scrapeSave(focusUsername, true)
    .then(scraped => {
      ig.getMedias(scraped.external_id, currentSession.session, 3000)
        .then(rawMedias => {
          console.log('posts:', rawMedias.length);
          rawMedias.map(media => {
            if (typeof media.caption != 'undefined' && media.caption.toLowerCase().includes(lookup)) {
              mentionCount++;
            }
            if (typeof media.usertags != 'undefined') {
              const tagged = media.usertags.in;
              tagged.map(tag => {
                if (tag.user.username.toLowerCase() == lookup) {
                  tagCount++;
                }
              })
            }
            return 'ok';
          });
          console.log('mentions: ', mentionCount, ' tags: ', tagCount);
        })
    })
})

app.get('/analyze/:username/:days', (req, res) => {
  console.log('api link established');
  res.send('whats going on?', 200); // connection success
  const params = {
    username: req.params.username,
    days: req.params.days
  };
  prospect.likers(params);
});

app.post('/get-following', (req, res) => {
  res.send('request received');
  ig.getFollowing(req.body.external_id, currentSession.session)
    .then(following => {
      queueFollowing(following, req.body.id)
        .then(result => {
          async.mapSeries(result, (user, next) => {
            database.userSuggestionsLoaded(user.username)
              .then(loaded => {
                next();
              })
          }, err => {
            console.log('complete');
          })
        })
        .catch(err => {
          console.error(err);
        })
    })
});

// show list of rank 1 suggestions as well as frequency of rank 1
app.get('/get-report-rank', (req, res) => {
  var topRanked = [];
  var topRankedDedupe = [];
  var results = [];
  database.getUserByUsername('viewrecip.es')
    .then(user => {
      database.getFollowing(user.id)
        .then(following => {
          async.mapSeries(following, (follow, next) => {
            database.getSuggestionsForUser(follow)
              .then(suggestions => {
                if (suggestions.length > 0) {
                  topRanked = topRanked.concat(suggestions);
                }
                next();
              })
              .catch(err => {
                console.log('error in getting suggestions');
                console.error(err);
                next();
              })
          }, (err, data) => {
            topRanked = topRanked.map(rank => {
              return rank.suggested_id;
            });
            topRankedDedupe = spliceDuplicates(topRanked);
            results = topRankedDedupe.map(user => {
              var filtered = topRanked.filter(result => {
                return result == user;
              })
              return [user, filtered.length];
            });
            async.mapSeries(results, (result, next) => {
              database.getUsernameFromEId(result[0])
                .then(username => {
                  result[0] = username.username;
                  next();
                })
            }, (err, data) => {
              results.sort((a, b) => {
                return b[1] - a[1];
              })
              console.log(results);
            })
          })
        })
    });
});

app.get('/lookup/:username', (req, res) => {
  database.usernameExists(req.params.username)
    .then(result => {
      if (result) {
        database.getUserByUsername(req.params.username)
          .then(user => {
            res.json(user);
          })
      } else {
        res.send('user not found in database!');
      }
    })
})

app.get('/tf-lookup/:username', (req, res) => {
  scrapeSave(req.params.username)
    .then(scrape => {
      database.getUserByEId(scrape.id)
        .then(user => {
          res.json({
            external_id: user.external_id,
            username: user.username,
            follower_count: user.follower_count,
            following_count: user.following_count,
            engagement_ratio: user.following_count / user.follower_count,
            post_count: user.post_count,
            recent_av_like: user.recent_like_count / user.recent_post_count,
            recent_av_comment: user.recent_comment_count / user.recent_post_count,
            like_ratio: (user.recent_like_count / user.recent_post_count) / user.follower_count
          });
        });
    });
});

app.get('/deep-lookup/:username', (req, res) => {
  prospect.deepLookup(req.params.username)
    .then(result => {
      res.send(result);
    })
})

// update this to work with tasks if you decide to use them
const queueFollowing = (following, primaryUserEId) => {
  console.log('queueFollowing activating!');
  const timeNow = new Date(Date.now()).toISOString();
  const upsertedUsers = [];
  return new Promise((resolve, reject) => {
    async.mapSeries(following, (follow, next) => {
      database.getUserByUsername(follow.username)
        .then(result => {
          if (result) {
            upsertedUsers.push(result);
            // (usereid, eid of person user is following)
            database.upsertRelationship(primaryUserEId, result.id, true)
              .then(related => {
                next();
              })
              .catch(err => {
                console.error(err);
                next();
              })
          } else {
            console.log('new user, inserting');
            const profile = { //add task to here
              username: follow.username,
              picture_url: follow.picture,
              full_name: follow.fullName,
              external_id: follow.id,
              private: follow.isPrivate
            };
            database.upsertUser(profile)
              .then(newUser => {
                console.log('newUser:', newUser);
                console.log('profile:', profile);
                profile.id = newUser;
                upsertedUsers.push(profile);
                database.upsertRelationship(primaryUserEId, newUser, true)
                  .then(related => {
                    next();
                  })
                  .catch(err => {
                    console.error(err);
                    next();
                  })
              })
          }
        })
    }, (err, dat) => {
      if (!err) {
        resolve(upsertedUsers);
      } else {
        reject(err);
      }
    })
  })
}

const PORT = process.env.PORT;

http.listen(PORT || 5760, () => {
  console.log('listening on port:', PORT || 5760);
});
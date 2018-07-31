// const ScrapeSave = require('./scrape-save');
// const scrapeSave = new ScrapeSave();
const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');
const Database = require('./database').Database;
const database = new Database();
const ParseScrape = require('./parse-scrape');
const Scraper = require('./scraper');
const ScraperMedia = require('./scraper-media');
const async = require('async');
const fs = require('fs');
const request = require('request');
const FileHandler = require('./file-controller');
const fileHandler = new FileHandler();
const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const app = express();
const currentSession = { initialized: false, session: {} };
const prospect = new (require('./prospect'))();
const messaging = new (require('./messaging'))();
const tfBridge = new (require('./tf-bridge'))();
const http = require('http').createServer(app);
const scraperManager = new (require('./scraper-manager'))();
const proxyManager = new (require('./proxy_manager'))();
const jobManager = new(require('./job-manager'))(database);
const pusher = new (require('./pusher'))();

app.use(staticMiddleware);
app.use(bodyParser.json());


// Initialization routines and parameters
jobManager.resetInProgress();
const MAXPOSTCOUNT = 300;
const MAXLIKERCOUNT = 10000; // public likers only
const MININFLUENCERFOLLOWERS = 5000;
var refreshJobs = [];
var refreshJobURLs = [];

const bullshit = require('./bullshit');

// Recurring jobs starting a minute after initialization
var schedule = require('node-schedule');
var recurringJob5;
var recurringJob1;
var recurringJob1Staggered;


const availableJobs = {
  scraper: true,
  media_pull: true,
  transfer: true,
  likers: true
}

const Jobs = require('./jobs');
const tasks = new Jobs(3);

const resetJob = job => {

}
// SELECT id, primary_username, analyzed_username, stage, queued, in_progress, prospect_count as count from prospect_jobs order by id desc limit 20;
setTimeout(() => {
  // delayed jobs
  refreshJobs = Object.assign(refreshJobs, jobManager.getRefreshJobs());

  // Every 5 minutes
  recurringJob5 = schedule.scheduleJob('*/5 * * * *', () => {
  });
  
  // Every 1 minuteSELECT id, primary_username, analyzed_username, stage, queued, in_progress, prospect_count as count from prospect_jobs order by id desc limit 20;
  recurringJob1 = schedule.scheduleJob('*/1 * * * *', () => {
    jobManager.getQueuedJobs()
      .then(jobs => {
        if (jobs[0]) {
          jobs.map(job => {
            if (tasks.jobAvailable()) {
              const nextStage = getNextJobStage(job);
              const activeJob = tasks.getAvailableJob(nextStage);
              if (activeJob != -1) {
                activeJob.jobId = job.id;
                activeJob.job = job;
                activeJob.active = true;
                activeJob.stage = nextStage;
                const jobUpdate = {
                  id: activeJob.jobId,
                  stage: nextStage
                };
  
                jobManager.updateJob(jobUpdate)
                  .then(job => {
                    // console.log('current job:', activeJob);
                  })
              }
            }
          })
        }
        tasks.jobs.map(task => {
          if (task.active && task.in_progress) {
            jobManager.checkIfActive(task.jobId)
              .then(isActive => {
                if (isActive) {
                  // console.log('job busy');
                } else {
                  task.active = false;
                  task.in_progress = false;
                  task.jobId = null;
                  task.stage = null;
                  console.log('job is no longer in progress, loading next');
                }
              })
          }
        })

      })
  });
  
  // Every 1 minute stagger 30 test
  recurringJob1Staggered = schedule.scheduleJob('30 * * * * *', () => {
    if (tasks.pending()) {
      tasks.getPending().forEach(task => {
        console.log('we gotta start the job!');
        launchNextJob(task);
      })
    } else {
      // console.log('no action will be taken:');
    }
  })
  }, 10000);
  
  const BatchDB = require('./batch_db');
  const batchDB = new BatchDB();

  
  
const launchNextJob = task => {
  console.log('trying to start task: ', task);
  // set job to in progress, unqueue
  const jobUpdate = {
    id: task.job.id,
    in_progress: true,
    queued: false
  };
  switch(task.stage) {
    case 'Gathering':
      if (availableJobs.likers) {
        task.stage = task.job.stage;
        task.in_progress = true;
        availableJobs.likers = false;
        startProspectJob(task.job);
        jobManager.updateJob(jobUpdate)
      } else {
        console.log('liker gathering task is busy');

      }
      break;
    case 'Scraping':
      if (availableJobs.scraper) {
        task.stage = task.job.stage;
        task.in_progress = true;
        availableJobs.scraper = false;
        startScrapingJob(task.job);
        jobManager.updateJob(jobUpdate)
      } else {
        console.log('scraping task is busy');
      }
      break;
    case 'Pulling Media':
      if (availableJobs.media_pull) {
        task.stage = task.job.stage;
        task.in_progress = true;
        availableJobs.media_pull = false;
        startMediaPull(task.job);
        jobManager.updateJob(jobUpdate)
      } else {
        console.log('media pulling task is busy');
      }
      break;
    case 'Transferring':
      if (availableJobs.transfer) {
        task.stage = task.job.stage;
        task.in_progress = true;
        availableJobs.transfer = false;
        startTFTransfer(task.job);
        jobManager.updateJob(jobUpdate)
      } else {
        console.log('transferring task is busy');
      }
      break;
    default:
      console.log('Stage Error for job id: ', task.job.id);
  }
}

const getNextJobStage = job => {
  switch(job.stage) {
    case 'Initialized':
      return 'Gathering';
      break;
    // case 'Gathering':
    //   return 'Awaiting Scrape';
    //   break;
    case 'Awaiting Scrape':
      return 'Scraping';
      break;
    // case 'Scraping':
    //   return 'Awaiting Media Pull';
    //   break;
    case 'Awaiting Media Pull':
      return 'Pulling Media';
      break;
    // case 'Pulling Media':
    //   return 'Awaiting Transfer';
    //   break;
    case 'Awaiting Transfer':
      return 'Transferring';
      break;
    // case 'Transferring':
    //   return 'Complete';
    //   break;
    default:
      console.log('Interrupted Stage');
      return job.stage;
  }
}


const jsdom = require('jsdom');
const { JSDOM } = jsdom;

app.get('/test-eachof', (req, res) => {
  var array = ['a', 'b', 'c'];
  async.eachOfSeries(array, (val, index, next) => {
    console.log('val: ', val);
    console.log('index: ', index);
    next();
  }, err => {
    console.log('over');
  })
})

// post._params.caption.match(/\B\@\w\w+\b/g)
const emailRE = /\b(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))\b/
app.get('/get-count/:tableName', (req, res) => {
  database.getCount(req.params.tableName)
  .then(count => {
    console.log(count);
    var iterator = [];
    for (let i = 0; i < count / 1000; i++) {
      iterator.push([i * 1000, i * 1000 + 1000])
    }
    async.eachSeries(iterator, (iter, next) => {
      database.getRowsByIdRange('users', iter[0], iter[1])
      .then(users => {
        async.eachSeries(users, (user, nextUser) => {
          const emailMatch = user.bio.match(emailRE);
          if (emailMatch) {
            database.updateRecord('users', { email: emailMatch[0].toLowerCase() }, 'id', user.id)
            .then(result => {
              nextUser();
            })
          } else {
            nextUser();
          }
        }, err => {
          next();
        })
      })
    }, err => {
      console.log('email setting done');
    })
    res.send(count);
  })
})

const nameParser = require('parse-full-name').parseFullName;
const emojiStrip = require('emoji-strip');
app.get('/get-first-names/:tableName', (req, res) => {
  database.getCount('suggestions')
    .then(count => {
      console.log(count);
      var iterator = [];
      for (let i = 10200; i < 16729124 / 1000; i++) {
        iterator.push([i * 1000, i * 1000 + 1000])
      }
      async.eachSeries(iterator, (iter, next) => {
        database.getRowsByIdRange('users', iter[0], iter[1])
          .then(users => {
            async.eachSeries(users, (user, nextUser) => {
              var parsedName = null;
              if (user.full_name) {
                try {
                  parsedName = nameParser(emojiStrip(user.full_name)).first;
                  parsedName = parsedName.replace(/[^0-9a-z'& ]/gi, '')
                } catch (error) {
                  console.log('error for:', user.username);
                }
              }
              // console.log(parsedName);
              if (parsedName == null || parsedName.length <= 2 || parsedName == 'The') {
                parsedName = '@' + user.username;
              }
              database.updateRecord('users', { first_name: parsedName }, 'id', user.id)
              .then(result => {
                nextUser();
              })
            }, err => {
              console.log(iter[1]);
              next();
            })
          })
      }, err => {
        console.log('email setting done');
      })
      res.send(count);
    })
})

app.get('/task-status', (req, res) => {
  console.log(availableJobs);
  tasks.jobs.forEach(task => {
    console.log('stage: ' + task.stage + ' active: ' + task.active);
  })
  res.send('ok');
})

app.get('/scraper/:username', (req, res) => {
  console.log('scraper');
  res.send('ok');
  Scraper(req.params.username)
  .then(user => {
    // console.log(user);
    var $elem = new JSDOM(user);
    var scripts = $elem.window.document.getElementsByTagName('script')
    for (script in scripts) {
      if (scripts[script].textContent && scripts[script].textContent.indexOf('window._sharedData') > -1) {
        var rawJSON = scripts[script].textContent.replace('window._sharedData =', '');
        if (rawJSON[rawJSON.length - 1] == ';') {
          rawJSON = rawJSON.slice(0, -1);
        }
        console.log(JSON.parse(rawJSON).entry_data.ProfilePage[0].graphql);
      }
    }
      // $elem.innerHTML = user;
      // const scripts = $elem.getElementsByTagName('script');
      // scripts.forEach(script => {
      //   console.log(script);
      // })
      // console.log((new DOMParser()).parseFromString(user, 'text/javascript'));
    })
})

app.get('/linktree', (req, res) => {
  console.log('linktree');
  res.send('ok')
  database.getLinktree()
    .then(users => {
      var formatted = [];
      users.forEach(user => {
        formatted.push([user.username, user.external_id]);
      })
      batchProspects(formatted, 1000).forEach(batch => {
        setTimeout(() => {
          tfBridge.submitProspectsLEGACY('https://app.truefluence.io/users/eatifyjohn/prospects/9531.csv?token=ME2Lfbezv9buWFTboadMAcd3', batch)
        }, 500);
      });
    })
})

app.get('/test-proxy-scrape/:username', (req, res) => {
  res.send('ok');
  Scraper(req.params.username)
    .then(result => {
      console.log(result.user);

    })
    // .catch(err => {
    //   res.send('no');
    //   console.error(err);
    // })
  })

app.get('/email-scrape', (req, res) => {
  database.emailScrape();
  res.sendStatus(200);
})

app.post('/test-download-image', (req, res) => {
  const parameters = processCreatePostJSON(req.body);
  const filename = parameters.url.substring(parameters.url.lastIndexOf('/') + 1);
  fileHandler.downloadFile(parameters.url, filename)
    .then(result => {
      prospect.createPost(result, parameters.caption)
      res.send('tim curry');
    })
})

app.post('/pusher', (req, res) => {
  pusher.ping(proxyManager);
  res.send('ok');
})

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

app.get('/get-user/:username', (req, res) => {
  prospect.getUser(req.params.username)
    .then(user => {
      console.log(user);
    })
})

app.get('/get-profile-stats/:username', (req, res) => {
  res.send('ok');
  const timeStart = new Date();
  prospect.getUser(req.params.username)
    .then(user => {
      // console.log(user);
      // hopefully get detailed user params
      // get follower count
      var followerCount = user.followerCount;
      prospect.getPosts(user.id, 2000)
        .then(posts => {
          // console.log(posts[0]);
          // sort posts by date ascending.
          var dateSorted = posts.sort((a, b) => {
            return a._params.takenAt - b._params.takenAt;
          })
          // get date of first post
          const firstPostDate = new Date(dateSorted[0]._params.takenAt);
          console.log('first post: ', dateSorted[0]._params)
          console.log('first post date: ' + firstPostDate);
          var timeNow = new Date();
          var timeDifference = timeNow - firstPostDate;
          var recentPosts = posts.filter(post => {
            return post._params.takenAt > addDays(timeNow, -30);
          })

          var adPosts = posts.filter(post => {
            return post._params.caption;
          })
            .filter(post => {
              return /#ad(\b|\W)/gi.test(post._params.caption) || /#sponsored(\b|\W)/gi.test(post._params.caption);
            });
          
          const accountAge = timeDifference / 1000 / 60 / 60 / 24 / 7;
          const postCount = posts.length;
          console.log(accountAge + ' account age (weeks)');
          console.log(followerCount / accountAge + ' av followers gain (followers/week)');
          console.log(postCount / accountAge + ' average post frequency (posts/week)');
          console.log(adPosts.length + ' ad posts out of ' + postCount);
          console.log(recentPosts.length + ' posts in last 30 days');
          console.log('time elapsed(sec): ' + (timeNow - timeStart) / 1000);
          // get follower increase per week.

        })
        .catch(err => {
          console.error(err);
        })
    })
})

const addDays = (begin, numberOfDays) => {
  var tempDate = new Date();
  tempDate.setDate(begin.getDate() + numberOfDays);
  return tempDate;
}

const addMonths = (begin, numberOfMonths) => {
  begin.setMonth(begin.getMonth() + numberOfMonths);
}


app.get('/get-post-breakdown/:jobId', (req, res) => {
  console.log('job ID: ', req.params.jobId);
  res.send('ok');
  database.getUsersByJobId(req.params.jobId)
    .then(users => {
      // console.log(users);
      const totalUsers = users.length;
      const privateUsers = users.filter(user => {
        return user.private;
      })
      const publicUsers = users.filter(user => {
        return !(user.private);
      })
      publicUsers.forEach(user => {
        user.bullshit = bullshit(user);
      })
      const influencers = publicUsers.filter(user => {
        return user.follower_count >= 2000;
      })
      const consumers = publicUsers.filter(user => {
        return user.follower_count < 2000;
      })
      const consumerCount = publicUsers.length - influencers.length;
      const influencerCount = influencers.length;
      const bullshitConsumerCount = consumers.filter(user => {
        return user.bullshit;
      }).length;
      
      const bullshitInfluencerCount = influencers.filter(user => {
        return user.bullshit;
      }).length;
      

      console.log('total users: ', totalUsers);
      console.log('private users: ' + privateUsers.length + ' (' + Math.round(privateUsers.length / totalUsers * 100, 2) + '%)');
      // console.log('public users: ' + publicUsers.length + ' (' + publicUsers.length / totalUsers * 100 + ')');
      console.log('consumers: ' + (consumerCount - bullshitConsumerCount) + '(' + Math.round((consumerCount - bullshitConsumerCount) / totalUsers * 100, 2) + ')');
      console.log('bullshit consumers: ' + bullshitConsumerCount + '(' + Math.round(bullshitConsumerCount / totalUsers * 100, 2) + '%)');
      console.log('influencers: ' + (influencerCount - bullshitInfluencerCount) + '(' + Math.round((influencerCount - bullshitInfluencerCount) / totalUsers * 100, 2) + '%)');
      console.log('bullshit influencers: ' + bullshitInfluencerCount + '(' + Math.round(bullshitInfluencerCount / totalUsers * 100, 2) + '%)');
      var realAudience = Math.round(((totalUsers - publicUsers.length) * 0.92) + consumerCount); 
      console.log('real audience: ' + realAudience + '(' + Math.round(realAudience/totalUsers, 2) + '%)');
    })
})

app.get('/get-posts/:username', (req, res) => {
  prospect.getRecentMedia(req.params.username)
    .then(medias => {
      res.send('medias');
      console.log(medias[0]);
    })
})

app.get('/prime-post-breakdown/:postId', (req, res) => {

  var media = {id: req.params.postId};
  console.log('marker');
  const newJob = {
    upload_url: 'media analysis',
    primary_username: 'eatifyjohn',
    analyzed_username: req.params.postId,
    stage: 'Initialized',
    target_list_id: 0000,
    terms: {},
    queued: false
  };
  // console.log(newJob);
  jobManager.createJob(newJob)
  .then(jobId => {
    tfBridge.createProspectList(newJob.primary_username, newJob.primary_username + ':' + newJob.analyzed_username, 'TRgvU9VaFD7X99ZA9LqYSUDk-u')
    .then(newList => {
      newList.id = jobId;
          // newList.queued = true;
          database.updateJob(newList)
          .then(job => {
            // console.log(newList);
            console.log('list and job created successfully');
            // should result in job queued 
            prospect.getPostLikers(media)
            .then(likers => {
              // res.send(result);
              // console.log('attempgint save:', likers.length);
              const timeNow = new Date(Date.now()).toISOString();
              // const splicedLikers = spliceDuplicates(likers);
              // console.log('after dupe splice:', splicedLikers.length);

              if (likers.length > 0) {
                const formattedLikers = likers.map(liker => {
                  return {
                    username: liker.username,
                    external_id: liker.id,
                    prospect_job_id: jobId,
                    relationship_type: 'liker',
                    created_at: timeNow,
                    updated_at: timeNow
                  }
                })
                // console.log(formattedLikers);
                // console.log('formatted likers:', formattedLikers);
                database.raw(batchDB.upsertProspects(formattedLikers))
                  .then(result => {
                    database.updateJob({id: jobId, stage: 'Awaiting Refreshing'})
                    .then(job2 => {
                      database.getJobByJobId(jobId)
                        .then(job => {
                          const listDetails = parseListDetails(job);
                          const submitURL = getSubmitURL(listDetails);
                          const downloadURL = getDownloadURL(listDetails);
                          // console.log(submitURL);
                          renderFormattedProspects(listDetails.prospect_job_id)
                            .then(prospects => {
                              prospectCount = prospects.length;
                              batchProspects(prospects).map(batch => {
                                setTimeout(() => {
                                  tfBridge.submitProspects(submitURL, batch);
                                }, 500);
                              })
                              //  messaging.send('gathering finished for:' + listDetails.username);
                              const jobUpdate = {
                                id: jobId,
                                in_progress: false,
                                stage: 'Awaiting Refresh'
                              };
                              jobManager.updateJob(jobUpdate)
                                .then(job2 => {
                                  console.log(jobId + ' - in_progress set to false');
                                  const verifyURL = getVerifyURL(listDetails);
                                  const downloadURL = getDownloadURL(listDetails);
                                  console.log('starting checking routing');
                                  setTimeout(() => {
                                    var checkJob = setInterval(checkIfRefreshed, 60000);
                                    res.send('refreshing');
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
                                                // get all external ids of people belonging to this prospect job
                                                // jobManager.getJobMembers(jobId)
                                                //   .then(members => {
                                                //     console.log(members);
                                                //   })
                                              });
                                          } else {
                                            // console.log('refresh not complete, retrying in 60 seconds');
                                          }
                                        })
                                    }
                                  }, 60000);
                                })
                              return ('baddd');
                            })
                        })
                    })
                    
                  })
                  .catch(err => {
                    console.error(err);

                  });
              } else {
                resolve(0);
              }

            })
            .catch(err => {
              console.error(err);
            })
          })
    })
    .catch(err => {
      console.error(err);
      res.send(err);
    })
  })
  .catch(err => {
    console.error(err);
    res.send(err);
  })
})

app.get('/get-ad-brands/:username', (req, res) => {
  var brands = [];
  prospect.getUser(req.params.username)
    .then(user => {
      // console.log(user);
      res.send('ok');
      prospect.getPosts(user.id)
        .then(posts => {
          console.log('posts received: ', posts.length);
          const adPosts = posts.filter(post => {
            return post._params.caption;
          })
          .filter(post => {
            return /#ad(\b|\W)/gi.test(post._params.caption) || /#sponsored(\b|\W)/gi.test(post._params.caption);
          })
          adPosts.forEach(post => {
            brands = brands.concat(post._params.caption.match(/\B\@\w\w+\b/g));
          })
          // splice duplicates
          spliceDuplicates(brands).forEach(brand => {
            if (brand !== null) {
              console.log(brand.replace('@', ''));
            }
          })
          // console.log(brands);
        })
    })
})

app.get('/test-message/:username', (req, res) => {
  prospect.getUser(req.params.username)
    .then(user => {
      prospect.sendMessage(user.id, 'testing!')
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

app.post('/gather', (req, res) => {
  console.log('gather request');
  const gatherObj = req.body.prospect_list;
  // console.log(req.body);

  const getAnalyzedUsername = reqBody => {
    if (reqBody.settings.reference_brands) {
      return (reqBody.settings.reference_brands[0] ? reqBody.settings.reference_brands[0] : reqBody.settings.instagram_username).replace('@', '');

    } else {
      return reqBody.settings.instagram_username;
    }
  }
  const newJob = {
    upload_url: gatherObj.upload_url,
    primary_username: gatherObj.settings.instagram_username,
    analyzed_username: getAnalyzedUsername(gatherObj),
    stage: 'Initialized',
    target_list_id: gatherObj.id,
    terms: gatherObj.settings.terms ? gatherObj.settings.terms : {},
    queued: false
  };
  // console.log(newJob);
  jobManager.createJob(newJob)
    .then(jobId => {
      tfBridge.createProspectList(newJob.primary_username, newJob.primary_username + ':' + newJob.analyzed_username, 'TRgvU9VaFD7X99ZA9LqYSUDk-u')
        .then(newList => {
          newList.id = jobId;
          newList.queued = true;
          database.updateJob(newList)
            .then(updated => {
              // console.log(newList);
              res.send('list and job created successfully');
              // should result in job queued 
            })
        })
        .catch(err => {
          console.error(err);
          res.send(err);
        })
    })
    .catch(err => {
      console.error(err);
      res.send(err);
    })
})

app.post('/distill', (req, res) => {
  console.log('distill request');
  // console.log(req.body);
  const distillRequest = req.body;
  console.log(distillRequest.prospect_list.id);
  getKeywords(distillRequest);
  jobManager.getJobByListId(distillRequest.prospect_list.id)
    .then(result => {
      if (result.length > 0) {
        // console.log(result);
        console.log('job exists');
        if (result.some(job => { return job.stage != 'Downloaded'; })) {
          console.log('some jobs incomplete');
        } else {
          console.log('all jobs complete');
          
        }
        result.forEach(job => {
          const lDetail = parseListDetails(job);
          console.log(job);
          console.log(job.queued_at ? 'yes' : 'no');
          console.log(lDetail)
          console.log(getDownloadURL(lDetail));
        })
      } else {
        console.log('job doesn\'t exist');
      }
    })
  // console.log(JSON.stringify(distillRequest));
  res.send('received');
});

const getKeywords = distillRequest => {
  const terms = Object.keys(distillRequest.prospect_list.settings.terms);
  const slug = {
    terms: terms.join('+'),
    count: terms.length
  } 
  console.log(slug);
}



getValue = (url, value, terminus = '/') => {
  if (url.indexOf(value) > 0) {
    const startPos = url.indexOf(value) + value.length;
    const endPos = url.indexOf(terminus, startPos) > 0 ? url.indexOf(terminus, startPos) : url.length;
    return url.substring(startPos, endPos);
  } else {
    return -1;
  }
}

const getVerifyURL = listDetails => {
  var verifyURL = 'https://app.truefluence.io/users/' + listDetails.username;
  verifyURL = verifyURL + '/lists/' + listDetails.listId + '.json?token=';
  verifyURL = verifyURL + listDetails.token;
  return verifyURL;
}

const getSubmitURL = listDetails => {
  var submitURL = 'https://app.truefluence.io/users/' + listDetails.username;
  submitURL = submitURL + '/prospects/' + listDetails.listId + '?token=';
  submitURL = submitURL + listDetails.token;
  return submitURL;
}

getDownloadURL = listDetails => {
  var downloadURL = 'https://app.truefluence.io/users/';
  downloadURL = downloadURL + listDetails.username + '/prospects/' + listDetails.listId + '.json?token=';
  downloadURL = downloadURL + listDetails.token;
  return downloadURL;
}


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

const startTFTransfer = job => {
  console.log('starting transfer');
  const listDetails = parseListDetails(job);
  const submitURL = getSubmitURL(listDetails);
  var transferCount = 0;
  database.getUsersByJobId(job.id)
    .then(result => {
      var users = result.filter(user => {
        return user.follower_count >= MININFLUENCERFOLLOWERS;
      })
      console.log('transfer count: ', users.length);
      var batches = batchProspects(users, 200);
      async.eachSeries(batches, (batch, iter) => {
        transferCount += batch.length;
        console.log(transferCount + ' out of ' + users.length);
        // replace everything here. get all medias belonging to these user ids.

        const userIds = batch.map(user => {
          return user.external_id;
        })
        console.log('user ids length: ', userIds.length);
        database.getMediasByUserIds(userIds)
          .then(medias => {
            console.log('medias returned length:', medias.length);
            return new Promise((resolve, reject) => {
              async.eachSeries(batch, (batchUser, next) => {
                // console.log('looking for id:', batchUser.external_id);
                const userMedias = medias.filter(media => { return media.user_external_id == batchUser.external_id; });
                if (userMedias.length > 0) {
                  // console.log('received ' + userMedias.length + ' medias for: ' + batchUser.username);
                  userMedias.forEach(media => {
                    delete media.id;
                  })
                  delete batchUser.id;
                  batchUser.medias = userMedias;
                } else {
                  // console.log('no user medias found');
                  batchUser.medias = [];
                }
                next();
              }, err => {
                resolve(batch);
              })
            })
          })
          .then(mediaBatch => {
            // console.log('mediaBatch received')
            var mediaUsers = mediaBatch.filter(user => { return user.medias }).filter(user => { return user.medias.length > 0 });
            // console.log('media users length:', mediaUsers.length);
            var uploadBatches = batchProspects(mediaUsers, 20);
            async.eachSeries(uploadBatches, (uploadBatch, next) => {
              setTimeout(() => {
                // console.log(uploadBatch[0]);
                tfBridge.submitProspects(submitURL, uploadBatch)
                  .then(result => {
                    // console.log(result);
                    next();
                  })
                  .catch(err => {
                    console.error(err);
                  })
              }, 300);
            }, err => {
              iter();
            })
          })
      }, err => {
        const jobUpdate = {
          id: job.id,
          in_progress: false,
          queued: false,
          stage: 'Complete'
        };
        jobManager.updateJob(jobUpdate)
          .then(update => {
            availableJobs.transfer = true;
            // launchNextJob(update);
            // console.log(job);
          })
      })
    })
}

const startMediaPull = job => {
  console.log('starting media pull');
  var prospectCount = 0;
  renderFormattedInfluencers(job.id, MININFLUENCERFOLLOWERS)
  .then(candidates => {
    var prospectIds = candidates.map(candidate => { return candidate[1]; });
    prospectIds = spliceDuplicates(prospectIds);
    var batches = batchProspects(prospectIds, 500);
    async.eachSeries(batches, (batch, next) => {
      prospectCount += batch.length;
      console.log(prospectCount + ' out of ' + prospectIds.length);
      // var arrMedias = [];
      proxyManager.getMedias(batch)
        .then(arrMedias => {
          console.log('medias gathered');
          database.raw(batchDB.upsertMedias(arrMedias))
            .then(result => {
              console.log('batch complete');
              next();
            })
            .catch(err => {
              console.log(batchDB.upsertMedias([arrMedias[0]]));
              console.error(err);
            })
          })
        }, err => {
          console.log('media pull complete');
          const jobUpdate = {
            id: job.id,
            in_progress: false,
            queued: true,
            stage: 'Awaiting Transfer'
          };
          jobManager.updateJob(jobUpdate)
            .then(update => {
              availableJobs.media_pull = true;
              // launchNextJob(update);
              // console.log(job);
            })
      })
    })
}

const startScrapingJob = job => {
  console.log('aggregating prospects for job: ', job.id);
  var users = [];
  var batchSize = 5000;
  var counter = 0;
  // const listDetails = parseListDetails(job);
  renderFormattedProspects(job.id)
    .then(candidates => {
      var prospects = candidates.map(candidate => { return candidate[0]; })
      console.log('presplice:', prospects.length);
      // console.log(prospects);
      // dedupe these prospects by external id.
      prospects = spliceDuplicates(prospects);
      console.log('post splice:', prospects.length);
      // console.log(prospects);

      var batches = batchProspects(prospects, batchSize);

      async.eachSeries(batches, (batch, next) =>{
        counter += batch.length;
        console.log('scraping ' + counter + ' of ' + prospects.length);
        scraperManager.scrapeUsers(batch)
          .then(userData => {
            console.log('batch upserting');
            database.raw(batchDB.upsertUsers(userData))
              .then(result => {
                next();
              })
            })
          }, err => {
            const jobUpdate = {
              id: job.id,
              in_progress: false,
              queued: true,
              stage: 'Awaiting Media Pull'
            };
            jobManager.updateJob(jobUpdate)
              .then(update => {
                availableJobs.scraper = true;
                // launchNextJob(update);
                // console.log(job);
              })
      })

    })
}

const startProspectJob = job => {
  const listDetails = parseListDetails(job);
  var prospectCount = 0;
  if (listDetails.loaded) {
    console.log('this job be ready to rock and roll!');
    prospect.batchLikers(job.analyzed_username, listDetails.prospect_job_id, MAXPOSTCOUNT, MAXLIKERCOUNT)
      .then(likers => {
        availableJobs.likers = true;
        const jobUpdate = {
          id: job.id,
          in_progress: false,
          queued: true,
          stage: 'Awaiting Scrape'
        };
        jobManager.updateJob(jobUpdate)
          .then(update => {
            // launchNextJob(update);
            // console.log(job);
          })
      })
      .catch(err => {
        console.log('batchLikers failure');
        console.error(err);
      })
  } else {
    console.log('prospect job with id:' + jobId + ' does not exist');
  }
}

const startProspectJobLEGACY = jobId => {
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
            // console.log('likers found:', likers.length);
            // console.log(job.id);
            const submitURL = getSubmitURL(listDetails);
            const downloadURL = getDownloadURL(listDetails);
            // console.log(submitURL);
            renderFormattedProspects(listDetails.prospect_job_id)
              .then(prospects => {
                prospectCount = prospects.length;
                batchProspects(prospects).map(batch => {
                  setTimeout(() => {
                    tfBridge.submitProspects(submitURL, batch);
                  }, 500);
                })
                //  messaging.send('gathering finished for:' + listDetails.username);
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
                        // console.log('refresh not complete, retrying in 60 seconds');
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

app.post('/update-leads', (req, res) => {
  console.log('received leads');
  // console.log(req.body.leads);
  const leads = req.body.leads.map(lead => { return lead.username });
  database.raw(batchDB.markUsersAsSent(leads))
  .then(result => {
    console.log(result);
    res.sendStatus(200);
  })
})

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

app.get('/batch-download-prospects/:jobId', (req, res) => {
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

app.get('/get-user-list', (req, res) => {
  const listURL = 'https://staging.truefluence.io/users/lawrencehunt_co/lists.json';
  tfBridge.downloadProspects(listURL);
  res.send('received');
})

app.get('/render-send-prospects/:jobId', (req, res) => {
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

renderFormattedInfluencers = (jobId, minCount = 4000) => {
  console.log('trying render formatted influencers: ', jobId);
  return new Promise((resolve, reject) => {
    database.getUsersByJobId(jobId)
      .then(prospects => {
        const formattedProspects = prospects.filter(prospect => {
          return (prospect.private == false || prospect.private == null) && prospect.follower_count >= minCount;
        }).map(prospect => {
          return [prospect.username, prospect.external_id];
        })
        console.log('returning ' + formattedProspects.length + ' public prospects out of ' + prospects.length);
        resolve(formattedProspects);
      })
  })
}

renderFormattedProspects = jobId => {
  console.log('trying render formatted: ', jobId);
  return new Promise((resolve, reject) => {
    database.getProspectsByJobId(jobId)
      .then(prospects => {
        const formattedProspects = prospects.filter(prospect => {
          return prospect.private == false || prospect.private == null;
        }).map(prospect => {
          return [prospect.username, prospect.external_id];
        })
        console.log('returning ' + formattedProspects.length + ' public prospects out of ' + prospects.length);
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
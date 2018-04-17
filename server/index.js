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
// const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };
const Prospect = require('./prospect');
const prospect = new Prospect();

const Messaging = require('./messaging');
const messaging = new Messaging();

const TFBridge = require('./tf-bridge');
const tfBridge = new TFBridge();

const http = require('http').createServer(app);

const scraperManager = new (require('./scraper-manager'))();

const ProxyManager = require('./proxy_manager');
const proxyManager = new ProxyManager();

app.use(staticMiddleware);
app.use(bodyParser.json());

// select id, username, 

const JobManager = require('./job-manager');
const jobManager = new JobManager(database);

const Pusher = require('./pusher');
const pusher = new Pusher();

// Initialization routines and parameters
jobManager.resetInProgress();
const MAXPOSTCOUNT = 100;
var refreshJobs = [];
var refreshJobURLs = [];

const bullshit = require('./bullshit');

// Recurring jobs starting a minute after initialization
var schedule = require('node-schedule');
var recurringJob5;
var recurringJob1;
var recurringJob1Staggered;

// const activeJob = {
//   active: false,
//   in_progress: false,
//   jobId: null,
//   job: {}
// }

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
        // console.log('new refresh jobs: ' + jobs.map(job => { return job.id }));
        if (jobs[0]) {
          jobs.map(job => {
            if (tasks.jobAvailable()) {

              const activeJob = tasks.getAvailableJob();
              activeJob.jobId = job.id;
              activeJob.job = job
              activeJob.active = true;

              const jobUpdate = {
                id: activeJob.jobId,
                in_progress: true
              };

              jobManager.updateJob(jobUpdate)
                .then(job => {
                  // console.log('current job:', activeJob);
                })
            }
          })
        }
        tasks.jobs.map(task => {
          if (task.active && task.in_progress) {
            jobManager.checkIfActive(task.jobId)
            // jobManager.checkIfActive(126)
              .then(isActive => {
                if (isActive) {
                  // console.log('job busy');
                } else {
                  task.active = false;
                  task.in_progress = false;
                  task.jobId = null;
                  console.log('job is no longer in progress, loading next');
                }
              })
          }
        })

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
    if (tasks.pending()) {
      tasks.getPending().map(task => {
        console.log('we gotta start the job!');
        task.in_progress = true;
        // set job to in progress, unqueue
        const jobUpdate = {
          id: task.jobId,
          in_progress: true,
          queued: false,
          stage: getNextJobStage(task.job)
        };
        jobManager.updateJob(jobUpdate)
          .then(job => {
            launchNextJob(job);
            // console.log(job);
          })
      })
    } else {
      // console.log('no action will be taken:');
    }
  })
}, 60000);

const BatchDB = require('./batch_db');
const batchDB = new BatchDB();

const launchNextJob = job => {
  switch(job.stage) {
    case 'Gathering':
      startProspectJob(job);
      break;
    case 'Scraping':
      startScrapingJob(job);
      break;
    case 'Pulling Media':
      startMediaPull(job);
      break;
    case 'Transferring':
      startTFTransfer(job);
      break;
    default:
      console.log('Stage Error for job id: ', job.id);
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

/*
{
  "brand_name" => "atever',
  "brand_username" => 'whatever',
  "instagram_media" => {
    "id"=>18,
    "instagram_user_id"=>2001,
    "external_id"=>"1564008820233265731_5759148120",
    "link"=>"https://www.instagram.com/p/BW0ebxLlOJD/",
    "image_low"=>"https://scontent.cdninstagram.com/vp/a48d1d7a69553ac6dc2b2f685b4a0eeb/5B1744B7/t51.2885-15/s320x320/e35/20180917_572370079819430_2476356784277684224_n.jpg",
    "image_standard"=>"https://scontent.cdninstagram.com/vp/e97a799d719c6e55101681f942c00b7d/5B0495F4/t51.2885-15/s640x640/sh0.08/e35/20180917_572370079819430_2476356784277684224_n.jpg",
    "image_thumbnail"=>"https://scontent.cdninstagram.com/vp/d4f9d234ab08b9b78f406e877406a811/5B2311F0/t51.2885-15/s150x150/e35/20180917_572370079819430_2476356784277684224_n.jpg",
    "like_count"=>0,
    "comment_count"=>0,
    "type"=>"image",
    "caption"=>"Meter.",
    "posted_at"=>Fri, 21 Jul 2017 19:13:22 UTC +00:00,
    "tags"=>[],
    "caption_usernames"=>[],
    "photo_usernames"=>["tfdemoj"],
    "latitude"=>nil,
    "longitude"=>nil,
    "created_at"=>Tue, 05 Dec 2017 04:12:01 UTC +00:00,
    "updated_at"=>Tue, 20 Feb 2018 19:14:17 UTC +00:00,
    "deleted"=>false,
    "shortcode"=>"BW0ebxLlOJD",
    "instagram_username"=>"tfdemofavorite",
    "usernames"=>["tfdemoj"]
  }
}
*/

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

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
  pusher.ping();
  res.send('ok');
})

// setTimeout(() => {
//   setInterval(() => {
//     pusher.ping();
//   }, 2100000);
// }, 60000)

/*
Below SC: should be “postinfo.co/tfdemofavorite"

For security and re-runnability how about his for the flow:
Truefluence pings the pusher that a new collaborations is available.
The pusher:
load recent posts from the TF IG account
load recent collaborations from truefluence.io/collaborations.json
push new collaboration posts to the TF IG account
And since there is no state then no db is needed. It could run on AWS lambda.
*/

// returns {caption: "", url: ""}
const processCreatePostJSON = json => {
  var caption = '.\n' + json.brand_name + '\n' +
  '📸Partner: @' + json.instagram_media.instagram_username + '\n' +
  'Visit @truefluence to discover who talks to your target market\n' +
  '.\n' +
  '.\n' +
  '.\n' +
  json.instagram_media.caption + '\n' +
  'SC:' + json.instagram_media.shortcode + '\n' +
  'postinfo.co/' + json.instagram_media.instagram_username;

  return {
    url: json.instagram_media.image_standard,
    caption: caption
  }
}

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

/*
 {
    id: 876950,
    username: 'jojoegaray',
    picture_url: 'https://scontent.cdninstagram.com/vp/afd1d1f5f16290ffb248ef2309280c6c/5B519315/t51.2885-19/s150x150/28154371_979843565499046_3229711515628077056_n.jpg',
    full_name: 'Carrying your lungs with me.❤',
    external_id: '480674522',
    private: false,
    following_count: 1511,
    follower_count: 3836,
    bio: 'MyDonorMyHero♻DonateLife\nDbl.LungTransplant 4•5•15♻\nPF Survivor \nScleroderma CKD Gp Tube fed\nBelieves in miracles🌟\nGrateful💐\nblessed✨\nloved♥️\nTexas📍',
    post_count: 1487,
    external_url: 'https://flipagram.com/f/lp2jw5c3Rg',
    created_at: 2017-11-09T19:53:21.016Z,
    updated_at: 2018-03-30T01:46:52.133Z,
    recent_like_count: 1050,
    recent_comment_count: 81,
    email: null,
    recent_post_count: 20,
    recent_video_count: 1,
    days_since_last_post: '0.37',
    recent_average_likes: '192.30',
    recent_engagement_rate: '0.06',
    recent_average_comments: '24.10',
    recent_like_rate: '0.05',
    recent_comment_rate: '0.01',
    truefluence_score: null }
    */


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
/*
{ prospect_list:
   { id: 5539,
     created_at: '2018-02-20T10:42:02.799-08:00',
     updated_at: '2018-02-26T19:46:31.582-08:00',
     user_id: 970,
     settings:
      { terms: [Object],
        region: 'eua',
        dream_partners: [],
        reference_brands: [Object],
        special_requests: '' },
     approved: false,
     token: 'rBn4c8nES7hBCm7Qrtc4EhzK',
     count: 0,
     refreshed_at: '2018-02-26T19:50:04.011-08:00',
     message: '',
     name: 'Prospects',
     notes: '',
     indexed_at: '2018-02-26T19:46:30.685-08:00',
     began_indexing_at: '2018-02-21T18:51:05.969-08:00',
     upload_url: 'https://app.truefluence.io/users/dgentrena/prospects/5539.csv?token=rBn4c8nES7hBCm7Qrtc4EhzK',
     candidate_count: 1000,
     prospect_count: 300,
     region: 'eua',
     special_requests: '',
     positive_keywords: 'cycling',
     reference_brands: '@rapha',
     dream_partners: '',
     follower_count_min: null,
     follower_count_ideal: null,
     follower_count_max: null,
     follower_following_ratio_min: null,
     follower_following_ratio_ideal: null,
     follower_following_ratio_max: null,
     recent_average_like_rate_min: null,
     recent_average_like_rate_ideal: null,
     recent_average_like_rate_max: null,
     recent_average_comment_rate_min: null,
     recent_average_comment_rate_ideal: null,
     recent_average_comment_rate_max: null,
     recent_average_engagement_rate_min: null,
     recent_average_engagement_rate_ideal: null,
     recent_average_engagement_rate_max: null,
     recent_average_post_rate_min: null,
     recent_average_post_rate_ideal: null,
     recent_average_post_rate_max: null,
     instagram_username: 'dgentrena',
     instgram_user_external_id: '1568926667',
     can_download: true,
     can_import: null,
     can_delete_shown: null,
     can_request_campaign: true } }
*/
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

// const getFilters = distillRequest => {
//   searchTerms = getKeywords(distillRequest);
//   return {
//     keywords: searchTerms.terms,
//     keywords_count: searchTerms.count,
//     min_followers: ,
//     max_followers: ,
//     min_following: ,
//     max_following: ,
//     min_posts: ,
//     max_posts: ,
//     min_recent_posts: ,
//     max_recent_posts: ,
//     min_
//   }
// }

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

// renderFormattedProspects(listDetails.prospect_job_id)
//   .then(prospects => {
//     prospectCount = prospects.length;
//     batchProspects(prospects).map(batch => {
//       setTimeout(() => {
//         tfBridge.submitProspects(submitURL, batch);
//       }, 500);
//     })
//   })
//   .then(result => {
//     const updateJob = {
//       id: listDetails.prospect_job_id,
//       list_sent: true,
//       prospect_count: prospectCount
//     }
//     console.log('update job:', updateJob);
//     database.updateJob(updateJob)
//       .then(done => {
//         // confirmed that update occurs
//         // start checking every minute to see if list is finished
//       })
//   })

const startTFTransfer = job => {
  console.log('starting transfer');
  const listDetails = parseListDetails(job);
  const submitURL = getSubmitURL(listDetails);
  database.getUsersByJobId(job.id)
    .then(users => {
      async.mapSeries(users, (user, next) => {
        database.getMediasByUserId(user.external_id)
          .then(medias => {
            medias.forEach(media => {
              delete media.id;
            })
            console.log('received medias for: ', user.username);
            delete user.id;
            user.medias = medias;
            next();
          })
      }, err => {
        // console.log(users[0]);
        // console.log(users[1]);
        batchProspects(users, 20).forEach(batch => {
          setTimeout(() => {
            tfBridge.submitProspects(submitURL, batch)
              .then(result => {

              })
              .catch(err => {
                console.error(err);
              })
          }, 500);
        });
        const jobUpdate = {
          id: job.id,
          in_progress: false,
          queued: false,
          stage: 'Complete'
        };
        jobManager.updateJob(jobUpdate)
          .then(update => {
            // launchNextJob(update);
            // console.log(job);
          })
      })
    })
}

const startMediaPull = job => {
  console.log('starting media pull');
  var arrMedias = [];
  renderFormattedProspects(job.id)
    .then(candidates => {
      var prospectIds = candidates.map(candidate => { return candidate[1]; });
      prospectIds = spliceDuplicates(prospectIds);

      proxyManager.getMedias(prospectIds)
        .then(arrMedias => {
          console.log('medias gathered');
          database.raw(batchDB.upsertMedias(arrMedias))
            .then(result => {
              console.log()
              const jobUpdate = {
                id: job.id,
                in_progress: false,
                queued: true,
                stage: 'Awaiting Transfer'
              };
              jobManager.updateJob(jobUpdate)
                .then(update => {
                  // launchNextJob(update);
                  // console.log(job);
                })
              // next();
            })
            .catch(err => {
              console.log(batchDB.upsertMedias([arrMedias[0]]));
              console.error(err);
            })
        })

      // async.mapSeries(prospectIds, (prospectId, next) => {
      //   prospect.getMedia(prospectId)
      //     .then(medias => {
      //       if (medias[0]) {
      //         medias.forEach(media => {
      //           media.user_external_id = prospectId;
      //           media.created_at = new Date();
      //           media.updated_at = new Date();
      //           arrMedias.push(media); 
      //         });
      //       }
      //       next();
      //     })
      //     .catch(err => {
      //       console.error(err);
      //       next();
      //     })
      // }, err => {
      //   console.log('media pull completed, upserting');
      //   // console.log(arrMedias);
      //   // console.log(batchDB.upsertMedias([arrMedias[0], arrMedias[1]]));
      //   // async.mapSeries(arrMedias, (media, next) => {
      //     database.raw(batchDB.upsertMedias(arrMedias))
      //       .then(result => {
      //         console.log()
      //         const jobUpdate = {
      //           id: job.id,
      //           in_progress: false,
      //           queued: true,
      //           stage: 'Awaiting Transfer'
      //         };
      //         jobManager.updateJob(jobUpdate)
      //           .then(update => {
      //             // launchNextJob(update);
      //             // console.log(job);
      //           })
      //         // next();
      //       })
      //       .catch(err => {
      //         console.log(batchDB.upsertMedias([arrMedias[0]]));
      //         console.error(err);
      //       })
      //   // })
      // })
    })
}

const startScrapingJob = job => {
  console.log('aggregating prospects for job: ', job.id);
  var users = [];
  // const listDetails = parseListDetails(job);
  renderFormattedProspects(job.id)
    .then(candidates => {
      var prospects = candidates.map(candidate => { return candidate[0]; })
      // console.log('presplice:', prospects.length);
      // console.log(prospects);
      // dedupe these prospects by external id.
      prospects = spliceDuplicates(prospects);
      // console.log('post splice:', prospects.length);
      // console.log(prospects);


      scraperManager.scrapeUsers(prospects)
        .then(userData => {
          console.log('batch upserting');
          database.raw(batchDB.upsertUsers(userData))
            .then(result => {
              const jobUpdate = {
                id: job.id,
                in_progress: false,
                queued: true,
                stage: 'Awaiting Media Pull'
              };
              jobManager.updateJob(jobUpdate)
                .then(update => {
                  // launchNextJob(update);
                  // console.log(job);
                })
            })
        })


      // async.mapSeries(prospects, (prospect, next) => {
      //   setTimeout(() => {
      //     Scraper(prospect)
      //       .then(user => {
              // user.user.created_at = new Date();
              // user.user.updated_at = new Date();
              // users.push(user.user);
              // console.log('scraped: ', user.user.username)
      //         // database.upsertUser(user.user)
      //         //   .then(result => {
      //         //     console.log('successful upsert');
      //         //     next();
      //         //   })
      //         //   .catch(err => {
      //         //     console.log('upser error');
      //         //     console.error(err);
      //         //     next();
      //         //   })
      //         next();
      //       })
      //       .catch(err => {
      //         console.log('error detected');
      //         setTimeout(() => {
      //             next();
      //           }, 30000);
      //         })
      //   }, 300);
      // }, err => {
      //   console.log('batch upserting');
      //   database.raw(batchDB.upsertUsers(users))
      //     .then(result => {
      //       const jobUpdate = {
      //         id: job.id,
      //         in_progress: false,
      //         queued: true,
      //         stage: 'Awaiting Media Pull'
      //       };
      //       jobManager.updateJob(jobUpdate)
      //         .then(update => {
      //           // launchNextJob(update);
      //           // console.log(job);
      //         })
      //     })
      //     // .then(result => {
      //     //   console.log('batch upsert count:', users.length);
      //     //   console.log(result);
      //     // })
      //     // .catch(err => {
      //     //   console.log('batch upsert failure');
      //     // })
      // })
    })
}

const startProspectJob = job => {
  const listDetails = parseListDetails(job);
  var prospectCount = 0;
  if (listDetails.loaded) {
    console.log('this job be ready to rock and roll!');
    prospect.batchLikers(job.analyzed_username, listDetails.prospect_job_id, MAXPOSTCOUNT)
      .then(likers => {
        // console.log(submitURL);
        // renderFormattedProspects(listDetails.prospect_job_id)
        //   .then(prospects => {
        //     prospectCount = prospects.length;
        //     batchProspects(prospects).map(batch => {
        //       setTimeout(() => {
        //         tfBridge.submitProspects(submitURL, batch);
        //       }, 500);
        //     })
        //     messaging.send('gathering finished for:' + listDetails.username);
        //     const jobUpdate = {
        //       id: jobId,
        //       in_progress: false,
        //       stage: 'Awaiting Scrape'
        //     };
        //     jobManager.updateJob(jobUpdate)
        //       .then(job2 => {
        //         console.log(jobId + ' - in_progress set to false');
        //       })
        //     return ('baddd');
        //   })
        //   .then(result => {
        //     const updateJob = {
        //       id: listDetails.prospect_job_id,
        //       list_sent: true,
        //       prospect_count: prospectCount
        //     }
        //     console.log('update job:', updateJob);
        //     database.updateJob(updateJob)
        //       .then(job => {
        //         return ('holla!');
        //       })
        //   })
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
              // console.log('likers found:', likers.length);
              // messaging.send(likers.length + ' likers saved to prospects, sending to Truefluence');
              const submitURL = getSubmitURL(listDetails);
              // console.log(submitURL);
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
  // scrapeSave(focusUsername, true)
  //   .then(scraped => {
  //     ig.getMedias(scraped.external_id, currentSession.session, 3000)
  //       .then(rawMedias => {
  //         console.log('posts:', rawMedias.length);
  //         rawMedias.map(media => {
  //           if (typeof media.caption != 'undefined' && media.caption.toLowerCase().includes(lookup)) {
  //             mentionCount++;
  //           }
  //           if (typeof media.usertags != 'undefined') {
  //             const tagged = media.usertags.in;
  //             tagged.map(tag => {
  //               if (tag.user.username.toLowerCase() == lookup) {
  //                 tagCount++;
  //               }
  //             })
  //           }
  //           return 'ok';
  //         });
  //         console.log('mentions: ', mentionCount, ' tags: ', tagCount);
  //       })
  //   })
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
  // ig.getFollowing(req.body.external_id, currentSession.session)
  //   .then(following => {
  //     queueFollowing(following, req.body.id)
  //       .then(result => {
  //         async.mapSeries(result, (user, next) => {
  //           database.userSuggestionsLoaded(user.username)
  //             .then(loaded => {
  //               next();
  //             })
  //         }, err => {
  //           console.log('complete');
  //         })
  //       })
  //       .catch(err => {
  //         console.error(err);
  //       })
  //   })
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
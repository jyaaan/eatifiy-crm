app.get('/analyze/:username/:days', (req, res) => {
  const focusUsername = req.params.username;
  const days = (typeof req.params.days != 'undefined') ? req.params.days : 30;

  res.send('influencer test for ' + focusUsername);
  var arrLikers = [];
  const publicLikerIds = [];
  var publicLikerNames = [];
  scrapeSave(focusUsername, true)
    .then(scraped => {
      console.log(scraped);
      ig.getMedias(scraped.external_id, currentSession.session, days)
        .then(medias => {
          console.log('medias count:', medias.length);
          async.mapSeries(medias, (media, next) => {
            ig.getLikers(media, currentSession.session)
              .then(likers => {
                arrLikers = arrLikers.concat(...likers);
                setTimeout(() => {
                  next();
                }, 1000)
              })
              .catch(err => {
                setTimeout(() => {
                  next();
                })
              })
          }, err => {
            console.log('likers count:', arrLikers.length);

            var likerNames = arrLikers.map(liker => { return liker.username; });
            var dedupedLikers = spliceDuplicates(likerNames);
            console.log('after dedupe:', dedupedLikers.length);

            var publicLikers = arrLikers.filter(liker => { return liker.isPrivate == false; });
            publicLikerNames = publicLikers.map(liker => { return liker.username; });
            var dedupedPublicLikers = spliceDuplicates(publicLikerNames);
            console.log('deduped public only:', dedupedPublicLikers.length);
            async.mapSeries(dedupedPublicLikers, (liker, next) => {
              scrapeSave(liker)
                .then(user => {
                  publicLikerIds.push(user.id);
                  next();
                })
                .catch(err => {
                  console.log('error detected, trying again...');
                  scrapeSave(liker)
                    .then(user2 => {
                      publicLikerIds.push(user2.id);
                      next();
                    })
                    .catch(err => {
                      console.log('second error, continuing');
                      next();
                    })
                })
            }, err => {
              database.getInfluencers(publicLikerIds)
                .then(influencers => {
                  const headers = ['id', 'externalId', 'username', 'followerCount', 'followingCount', 'following/follower ratio', 'recentAvLikes', 'recentAvComments', 'engagementRatio', 'postFrequency(Hr)', 'likesCount', 'website'];
                  var influencerData = influencers.map(influencer => {
                    return influencer.id +',' + influencer.external_id + ',' + influencer.username + ',' + influencer.follower_count + ',' + 
                    influencer.following_count + ',' + (influencer.following_count / influencer.follower_count) + ',' + (influencer.recent_like_count / influencer.recent_post_count) + ',' +
                    (influencer.recent_comment_count / influencer.recent_post_count) + ',' + (influencer.recent_like_count / influencer.recent_post_count) / influencer.follower_count + ',' + ((influencer.recent_post_duration / 3600) / influencer.recent_post_count) + ',' +
                    publicLikerNames.filter(likerName => { return likerName == influencer.username; }).length + ',' + influencer.external_url;
                  });
                  fileHandler.writeToCSV(influencerData, focusUsername + '-influencer-data', headers)
                    .then(result => {
                      // database.getConsumers(publicLikerIds)
                      //   .then(consumers => {
                      //     var consumerData = consumers.map(consumer => {
                      //       return consumer.id +',' + consumer.external_id + ',' + consumer.username + ',' + consumer.follower_count + ',' + 
                      //       consumer.following_count + ',' + (consumer.following_count / consumer.follower_count) + ',' + 
                      //       consumer.recent_post_count + ',' + consumer.recent_like_count + ',' + consumer.recent_comment_count + ',' + ((consumer.recent_post_duration / 3600) / consumer.recent_post_count) + ',' +
                      //       publicLikerNames.filter(likerName => { return likerName == consumer.username; }).length + ',' + consumer.external_url;
                      //     })
                      //     fileHandler.writeToCSV(consumerData, focusUsername + '-consumer-data', headers);
                      //   })
                    })
                })
            });
          })
        });
    })
    .catch(err => {
      console.error(err);
    })
});
const request = require('request');
const Database = require('./database').Database;
const database = new Database();

function TFBridge() {

}

TFBridge.prototype.getProspectList = function (listURL, token, batchID) {

}

/*
prospect link download example
https://app.truefluence.io
/users
/sidewalkguide
/prospects
/1011
	?sort_field=prospect_score
		&direction=desc
		&page=2
		&state_columns%5Bcol_recent_mentions%5D=false
		&state_columns%5Bcol_account%5D=true
		&state_columns%5Bcol_followers%5D=true&state_columns%5Bcol_recent_average_likes%5D=true
		&state_columns%5Bcol_recent_average_comments%5D=true
		&state_columns%5Bcol_recent_like_rate%5D=false
		&state_columns%5Bcol_recent_comment_rate%5D=false
		&state_columns%5Bcol_recent_engagement_rate%5D=true
		&state_columns%5Bcol_favorite%5D=true
		&number_columns=6
		&minus_offset=0

*/

TFBridge.prototype.submitProspects = function (url, users) {
  // database.getThousand()
  //   .then(thousand => {
  //     const thousandValue = thousand.map(row => { return [row.username, row.external_id]; });
  //     // console.log(thousandValue);

  //     convertAndSend(thousandValue, ['username', 'external_id'], url);
  //   })
  convertAndSend(users, ['username', 'external_id'], url);
}

/*
returned object keys:
'users'[]
{ id: 136262,
  external_id: '176205999',
  username: 'albalanx_ed',
  picture_url: 'https://scontent.cdninstagram.com/t51.2885-19/s150x150/21224155_115610065805558_2934384964445143040_a.jpg',
  full_name: 'Allie Duff',
  website: 'https://albalanxed.com/2017/09/16/albalanxed-adds-oils/',
  bio: '�in ed recovery.\n�mental health matters.\n☯️seeking balanx in every aspect of my life!\n✨dōTERRA Wellness Advocate.',
  following_count: 1184,
  follower_count: 620,
  post_count: 952,
  recent_like_count: 487,
  recent_comment_count: 28,
  recent_post_count: 16,
  recent_video_count: 0,
  created_at: '2017-06-12T22:55:44.289Z',
  updated_at: '2017-10-12T22:13:29.563Z',
  refreshed_summary_at: '2017-10-12T22:13:29.558Z',
  status: 'active',
  days_since_last_post: 0.103537,
  favorite: false,
  favorited_at: null,
  prospect: true,
  prospect_score: 0,
  recent_mention_count: 0,
  last_mentioned_at: null,
  recent_average_likes: 30.4375,
  recent_engagement_rate: 0.051915322580645164,
  recent_average_comments: 1.75,
  recent_like_rate: 0.04909274193548387,
  recent_comment_rate: 0.00282258064516129,
  bio_first_email: null,
  follower_following_ratio: 0.5236486486486487,
  medias:
       { id: 88688770,
       instagram_user_id: 136262,
       external_id: '1616352268865374525_176205999',
       link: 'https://www.instagram.com/p/BZub9Mhngk9/',
       image_low: 'https://scontent.cdninstagram.com/t51.2885-15/s320x320/e35/22071506_145984156008948_2181362397275488256_n.jpg',
       image_standard: 'https://scontent.cdninstagram.com/t51.2885-15/s640x640/sh0.08/e35/22071506_145984156008948_2181362397275488256_n.jpg',
       image_thumbnail: 'https://scontent.cdninstagram.com/t51.2885-15/s150x150/e35/22071506_145984156008948_2181362397275488256_n.jpg',
       like_count: 58,
       comment_count: 3,
       created_at: '2017-10-12T00:14:15.086Z',
       updated_at: '2017-10-12T22:13:29.475Z',
       caption: 'walking into October with the intention to be more present & take note of the simple pleasures life has to offer. �#everythinghappensforareason',
       posted_at: '2017-10-02T00:30:27.000Z',
       tags: [Object],
       usernames: [],
       type: 'image',
       latitude: 44.2333,
       longitude: -76.4833 },
'meta'
  { current_page: 1,
  next_page: 2,
  prev_page: null,
  total_pages: 20,
  total_count: 1000,
  limit_value: 50 }

'sort_field'

'direction'
    asc/desc

'filters'
    json object of parameters

'state_columns'

'prospect_lists'

*/

TFBridge.prototype.downloadProspects = function (url) {
  var options = {
    url: url,
    method: 'GET'
  };
  request(options, (err, res, bod) => {
    if (err) {

    } else {
      // console.log('res', res);
      // console.log('bod', Object.keys(bod));
      const bodyObj = JSON.parse(bod);
      console.log(Object.keys(bodyObj));
      console.log(bodyObj);
    }
  });

}

/*
prospect list submit link examples
https://staging.truefluence.io/users/eatify/prospects/1013.csv?token=oiUBxMQ9KzvBezCyGX1gLDMS
https://staging.truefluence.io/users/truefluence9/prospects/1014.csv?token=HiXCZHs23YdnmUbqAKdWqqVj

*/

const convertAndSend = (array, header, url) => {
  console.log('testing csv send');
  var rows = [
    ['username', 'external_id'],
    ...array
  ];
  var processRow = function (row) {
    var finalVal = '';
    finalVal += row;
    // finalVal += ',';
    return finalVal + '\n';
  };
  var csvFile = '';
  rows.map(row => {
    csvFile += processRow(row);
  })
  signal(csvFile, url);
  // fileHandler.saveCSV(csvFile, 'aaaa output');
}

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
  // console.log('if this shows, we\'ve done something');
  request(options);
  console.log('submission complete');
}

module.exports = TFBridge;

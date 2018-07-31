const format = require('pg-format');

class BatchDB {
  constructor() {

  }

  updateUsers(arrValues) {
    const updateKeys = ['username', 'sent_postinfo_email'];
    var queryText = format('INSERT INTO users (%I) VALUES %L', updateKeys, spreadFormattedValues(updateKeys, arrValues));
    queryText += ' ON CONFLICT (username) ';
    queryText += 'DO UPDATE SET ' + formatConflictKeys(['sent_postinfo_email']) + ';';
    console.log(queryText);
    return queryText;
  }

  markUsersAsSent(users) {
    var queryText = format('UPDATE users SET sent_postinfo_email = true WHERE username IN (%L);', users);
    console.log(queryText);
    return queryText;
  }

  upsertUsers(arrValues) {
    var queryText = format('INSERT INTO users (%I) VALUES %L', userKeys, spreadFormattedValues(userKeys, arrValues));
    queryText += ' ON CONFLICT (external_id) ';
    queryText += 'DO UPDATE SET ' + formatConflictKeys(userConflictKeys) + ';';

    return queryText;
  }

  upsertProspects(arrValues) {
    var queryText = format('INSERT INTO prospects (%I) VALUES %L;', prospectKeys, spreadFormattedValues(prospectKeys, arrValues));

    return queryText;    
  }

  upsertMedias(arrValues) {
    var queryText = format('INSERT INTO medias (%I) VALUES %L', mediaKeys, spreadFormattedValues(mediaKeys, arrValues));
    queryText += ' ON CONFLICT (external_id) ';
    queryText += 'DO UPDATE SET ' + formatConflictKeys(mediaConflictKeys) + ';';
    return queryText;
  }
}

const timeNow = new Date(Date.now()).toISOString();

const userKeys = [
  'username',
  'picture_url',
  'full_name',
  'external_id',
  'following_count',
  'follower_count',
  'bio',
  'post_count',
  'website',
  'created_at',
  'updated_at',
  'email',
  'recent_post_count',
  'recent_video_count',
  'days_since_last_post',
  'recent_average_likes',
  'recent_engagement_rate',
  'recent_average_comments',
  'recent_like_rate',
  'recent_comment_rate',
  'private'
];

const prospectKeys = [
  'username',
  'external_id',
  'prospect_job_id',
  'relationship_type',
  'created_at',
  'updated_at',
  'private'
]

const mediaKeys = [
  'posted_at',
  'external_id',
  'image_low',
  'image_standard',
  'image_thumbnail',
  'caption',
  'link',
  'like_count',
  'comment_count',
  'type',
  'filter_type',
  'photo_usernames',
  'photo_external_user_ids',
  'latitude',
  'longitude',
  'created_at',
  'updated_at',
  'user_external_id'
]

const mediaConflictKeys = [
  'posted_at',
  'external_id',
  'image_low',
  'image_standard',
  'image_thumbnail',
  'caption',
  'link',
  'like_count',
  'comment_count',
  'type',
  'filter_type',
  'photo_usernames',
  'photo_external_user_ids',
  'latitude',
  'longitude',
  'updated_at'
]

const prospectConflictKeys = [
  'username',
  'updated_at',
  'relationship_type',
  'private'
]

const userConflictKeys = [
  'username',
  'picture_url',
  'full_name',
  'following_count',
  'follower_count',
  'bio',
  'post_count',
  'website',
  'updated_at',
  'email',
  'recent_post_count',
  'recent_video_count',
  'days_since_last_post',
  'recent_average_likes',
  'recent_engagement_rate',
  'recent_average_comments',
  'recent_like_rate',
  'recent_comment_rate',
  'private'
];


// add exception handling
const formatValuesByKeys = (keys, values) => {
  const formattedValues = keys.map(key => {
    return values[key];
  })
  return formattedValues;
}

const spreadFormattedValues = (keys, arrValues) => {
  const formattedArrValues = arrValues.map(values => {
    return formatValuesByKeys(keys, values);
  });
  return formattedArrValues;
}

const formatConflictKeys = keys => {
  const conflictValues = keys.map(key => {
    return key + ' = ' + 'EXCLUDED.' + key;
  });
  return conflictValues;
}

const formatVariables = keys => {
  const variables = keys.map((key, i) => {
    return '$' + (i + 1);
  })
  return [...variables];
}

module.exports = BatchDB;
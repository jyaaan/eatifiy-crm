const React = require('react');
const store = require('./store');
const Segment = require('semantic-ui-react').Segment;
const Statistic = require('semantic-ui-react').Statistic;
const Image = require('semantic-ui-react').Image;
const Item = require('semantic-ui-react').Item;
const Label = require('semantic-ui-react').Label;
const Icon = require('semantic-ui-react').Icon;

Date.prototype.formatMMDDYYYY = function(){
	return ((this.getMonth()+1)+"/"+this.getDate()+"/"+this.getFullYear());
};

const MediaItem = (media) => {
  var postDate = new Date(media.date * 1000);
  return (
    <Item>
      <a href={ media.media_url }>
        <Item.Image size='small' src={ media.picture_url } />
      </a>

      <Item.Content>
        <Item.Header as='a'>Posted on: { postDate.formatMMDDYYYY() }</Item.Header>
        <Item.Meta>
          <span className='cinema'>Likes: { media.like_count } Comments: { media.comment_count }</span>
        </Item.Meta>
        <Item.Description>{ media.caption }</Item.Description>
      </Item.Content>
    </Item>
  )
}

const handleButton = () => {
  console.log('whee');
}

window.addEventListener('keydown', event => {
  console.log(event.key);
});

const userProfile = user => {
  const engagement = ((user.recent_like_count + user.recent_comment_count) / user.recent_post_count / user.follower_count * 100).toFixed(2);
  const items = [
    { label: 'Username', value: user.username },
    { label: 'Posts', value: (user.post_count).toLocaleString() },
    { label: 'Followers', value: (user.follower_count).toLocaleString() },
    { label: 'Following', value: (user.following_count).toLocaleString() },
    { label: 'Av. Likes', value: ((user.recent_like_count / user.recent_post_count).toFixed(1)).toLocaleString() },
    { label: 'Av. Comments', value: ((user.recent_comment_count / user.recent_post_count).toFixed(1)).toLocaleString() },
    { label: 'Engagement Rate', value: engagement + '%'}
  ]
  const profileLink = 'http://www.instagram.com/' + user.username;
  return (
    <div className='ui centered row'>
      <div>
        <div>
          <a href={ profileLink }>
            <img className='ui small image centered column' src={ user.picture_url } />
          </a>
        </div>
        <div>
          <Segment inverted>
            <Statistic.Group items={items} size='small' inverted color='green' />
          </Segment>
        </div>
      </div>
      <div className='ui centered row'>
        <p>{ user.bio }</p>
        <button
          className='ui button analyzebtn'
          onClick={ handleButton }>And Whee!</button>
      </div>
    </div>
  )
}

const userMedias = (medias) => {
  const result = medias.map(media => {
    return (
        MediaItem(media)
    )
  });
  return (
    <Item.Group divided>
      { result }
    </Item.Group>
  );
}

const pageRender = (user, medias) => {
  const profile = userProfile(user);
  const posts = userMedias(medias);
  return (
    <div>
      {profile}
      {posts}
    </div>
  )
}

const EasyFilter = params => {
  const { user, medias } = params;

  return (
    pageRender(user, medias)
  )
}

module.exports = EasyFilter;
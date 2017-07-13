const React = require('react');
const store = require('./store');
const ScraperMedia = require('../server/scraper');


const Segment = require('semantic-ui-react').Segment;
const Statistic = require('semantic-ui-react').Statistic;
const Image = require('semantic-ui-react').Image;
const Item = require('semantic-ui-react').Item;
const Label = require('semantic-ui-react').Label;
const Icon = require('semantic-ui-react').Icon;
const Button = require('semantic-ui-react').Button;


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

// labels: (P)rospect (B)rand (C)onsumer
window.addEventListener('keydown', event => {
  console.log(event.key);
  if (typeof currentProspect.id != 'undefined') {
    switch (event.key) {
      case 'w':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            accepted: true
          }
        });
        prospects[position].accepted = true;
        currentProspect = prospects[position];
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'a':
        if (position == 0) {
          position = prospects.length - 1;
        } else {
          position--;
        }
        currentProspect = prospects[position];
        console.log('new prospect:', currentProspect);
        store.dispatch({
          type: 'LOAD_USER',
          username: currentProspect.username
        })
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 's':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            accepted: false
          }
        });
        prospects[position].accepted = false;
        currentProspect = prospects[position];
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'd':
        if (position < prospects.length - 1) {
          position++;
        } else {
          position = 0;
        }
        currentProspect = prospects[position];
        console.log('new prospect:', currentProspect);
        store.dispatch({
          type: 'LOAD_USER',
          username: currentProspect.username
        })
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'b':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            category: 'B'
          }
        });
        prospects[position].category = 'B';
        currentProspect = prospects[position];
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'e':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            category: 'P'
          }
        });
        prospects[position].category = 'P';
        currentProspect = prospects[position];
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'e':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            category: 'U'
          }
        });
        prospects[position].category = 'U';
        currentProspect = prospects[position];
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 't':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            category: 'C'
          }
        });
        prospects[position].category = 'C';
        currentProspect = prospects[position];
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'f':
        store.dispatch({
          type: 'REFRESH_USER'
        });
        break;
    }
  }
});

var currentProspect = {};
var prospects = [];
var position = 0;
const userProfile = user => {
  const engagement = ((user.recent_like_count + user.recent_comment_count) / user.recent_post_count / user.follower_count * 100).toFixed(2);
  const items = [
    { label: 'Username', value: user.username },
    { label: 'Posts', value: (user.post_count).toLocaleString() },
    { label: 'Followers', value: (user.follower_count).toLocaleString() },
    { label: 'Following', value: (user.following_count).toLocaleString() },
    { label: 'Av. Likes', value: ((user.recent_like_count / user.recent_post_count).toFixed(1)).toLocaleString() },
    { label: 'Av. Comments', value: ((user.recent_comment_count / user.recent_post_count).toFixed(1)).toLocaleString() },
    { label: 'Engagement Rate', value: engagement + '%' },
    { label: 'Category', value: currentProspect.category },
    { label: 'Position', value: position + 1 },
    { label: 'Total', value: prospects.length },
    { label: '', value: currentProspect.accepted ? 'ACCEPTED' : ''}
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

const loadTest = event => {
  console.log('loading:', event.target.id);
  position = 0;
  // store.dispatch({
  //   type: 'LOAD_USER',
  //   username: 'gamegrumps'
  // })
  fetch('/prospect-list/' + event.target.id)
    .then(resp => resp.json())
    .then(data => {
      prospects = data;
    })
    .then(() => {
      currentProspect = prospects[position];
      console.log('currentProspect:', currentProspect);
    })
    .then(() => {
      store.dispatch({
        type: 'LOAD_USER',
        username: currentProspect.username
      })
    })
    .then(() => {
      setTimeout(() => {
        store.dispatch({
          type: 'REFRESH_USER'
        });
      }, 1000);
    })
}

const stateTest = () => {
  console.log('state:', store.getState().easyFilter);
}

const refreshTest = () => {
  store.dispatch({
    type: 'REFRESH_USER'
  })
}

const pageRender = (user, medias) => {
  const profile = userProfile(user);
  const posts = userMedias(medias);
  return (
    <div>
      <button
        className="ui button"
        id='kodiakcakes'
        onClick= { loadTest }>kodiakcakes</button>
      <button
        className="ui button"
        id='polkadot_pr'
        onClick= { loadTest }>polkadot_pr</button>
      <button
        className="ui button"
        id='rxbar'
        onClick= { loadTest }>rxbar</button>
      {profile}
      {posts}
      <button
        className="ui button"
        onClick= { refreshTest }>Refresh State</button>
    </div>
  )
}

const EasyFilter = params => {
  console.log('params:', params);
  const { user, medias } = params;
  return (
    pageRender(user, medias)
  )
}

const loadUser = (username) => { // now with more resume-ability!
  console.log('scraping', username);
  return new Promise((resolve, reject) => {
    ScraperMedia(username)
      .then(slug => {
        resolve({ user: slug.user, medias: slug.medias });
      })
      .catch(err => {
        console.log('ScraperMedia error');
        reject(err);
      })
  });
}

module.exports = EasyFilter;
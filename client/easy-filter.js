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
  console.log('failure at id?', currentProspect.id);
  if (typeof currentProspect.id != 'undefined') {
    switch (event.key) {
      case 'w':
        if(currentProspect.accepted == true) {
          store.dispatch({
            type: 'UPDATE_PROSPECT',
            id: currentProspect.id,
            params: {
              accepted: null
            }
          });
          prospects[position].accepted = null;
        } else {
          store.dispatch({
            type: 'UPDATE_PROSPECT',
            id: currentProspect.id,
            params: {
              accepted: true
            }
          });
          prospects[position].accepted = true;
        }
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
        if(currentProspect.accepted == false) {
          store.dispatch({
            type: 'UPDATE_PROSPECT',
            id: currentProspect.id,
            params: {
              accepted: null
            }
          });
          prospects[position].accepted = null;
        } else {
          store.dispatch({
            type: 'UPDATE_PROSPECT',
            id: currentProspect.id,
            params: {
              accepted: false
            }
          });
          prospects[position].accepted = false;
        }
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
        setTimeout(() => {
          store.dispatch({
            type: 'REFRESH_USER'
          });
        }, 500);
        break;
      case 'u':
        store.dispatch({
          type: 'UPDATE_PROSPECT',
          id: currentProspect.id,
          params: {
            category: 'U'
          }
        });
        prospects[position].category = 'U';
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
        console.log('current prospect:', currentProspect);
        break;
      default:
        break;
    }
  }
});

var currentProspect = {};
var prospects = [];
var masterProspects = [];
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
    { label: '', value: currentProspect.accepted == true ? 'ACCEPTED' : currentProspect.accepted == null ? '' : 'REJECTED' },
  ]
  var acceptedCount = prospects.filter(prospect => {
    return prospect.accepted == true;
  });
  const profileLink = 'http://www.instagram.com/' + user.username;
  return (
    <div className='ui centered row'>
      <div>
        <div>
          <a href={ profileLink }>
            <img className='ui small image centered column' src={ user.picture_url } />
          </a>
          <h3><input
            type="checkbox" 
            id="accepted-check"
            defaultChecked="true"
            onClick={ toggleFilter }/>Accepted: { acceptedCount.length }
          , <input
            type="checkbox" 
            id="rejected-check"
            defaultChecked="true"
            onClick={ toggleFilter }/>Rejected: { prospects.filter(prospect => { return prospect.accepted == false }).length } 
          , <input
            type="checkbox" 
            id="remain-check"
            defaultChecked="true"
            onClick={ toggleFilter }/>Remain: { prospects.filter(prospect => { return prospect.accepted == null }).length } </h3>
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
          className="ui button"
          id='tester'
          onClick= { resetFilters }>reset filter</button>
        <button
          className="ui button"
          id='trester'
          onClick= { downloadCSV }>Download Accepted</button>
      </div>
    </div>
  )
}

const resetFilters = () => {
  document.querySelector('#accepted-check').checked = true;
  document.querySelector('#rejected-check').checked = true;
  document.querySelector('#remain-check').checked = true;
  position = 0;
  prospects = masterProspects;
  currentProspect = prospects[0];
  store.dispatch({
    type: 'LOAD_USER',
    username: currentProspect.username
  })
  setTimeout(() => {
    store.dispatch({
      type: 'REFRESH_USER'
    });
  }, 500);
}

const toggleFilter = () => {
  var filteredProspects = [];
  if (document.querySelector('#accepted-check').checked) {
    console.log('accepted checked');
    filteredProspects = filteredProspects.concat(masterProspects.filter(prospect => { return prospect.accepted == true }));
    // console.log(masterProspects.filter(prospect => { return prospect.accepted == true }));
    // console.log('filtered prospects:', filteredProspects);
  }
  if (document.querySelector('#rejected-check').checked) {
    console.log('rejected checked');
    filteredProspects = filteredProspects.concat(masterProspects.filter(prospect => { return prospect.accepted == false }));
  }
  if (document.querySelector('#remain-check').checked) {
    filteredProspects = filteredProspects.concat(masterProspects.filter(prospect => { return prospect.accepted == null }));
  }
  // console.log('here are the filtered:', filteredProspects);
  position = 0;
  prospects = filteredProspects;
  currentProspect = prospects[0];
  store.dispatch({
    type: 'LOAD_USER',
    username: currentProspect.username
  })
  setTimeout(() => {
    store.dispatch({
      type: 'REFRESH_USER'
    });
  }, 500);
}

/*
toggle > check state > apply filters to state > 
*/

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
      masterProspects = prospects;
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
    type: 'LOAD_USER',
    username: currentProspect.username
  })
  store.dispatch({
    type: 'REFRESH_USER'
  })
  console.log('current prospect:', currentProspect);
}

const pageRender = (user, medias) => {
  const profile = userProfile(user);
  const posts = userMedias(medias);
  return (
    <div>
      <button
        className="ui button"
        id='okokocosmetiques'
        onClick= { loadTest }>okokocosmetiques</button>
      <button
        className="ui button"
        id='honeymamas'
        onClick= { loadTest }>honeymamas</button>
      {profile}
      {posts}
    </div>
  )
}
      // <button
      //   className="ui button"
      //   id='kodiakcakes'
      //   onClick= { loadTest }>kodiakcakes</button>
      // <button
      //   className="ui button"
      //   id='polkadot_pr'
      //   onClick= { loadTest }>polkadot_pr</button>
      // <button
      //   className="ui button"
      //   id='rxbar'
      //   onClick= { loadTest }>rxbar</button>
      // <button
      //   className="ui button"
      //   id='gomacro'
      //   onClick= { loadTest }>gomacro</button>

const downloadCSV = () => {
  const toSave = prospects.filter(prospect => { return prospect.accepted == true; }).map(prospect => { return prospect.username });
  console.log('trying to save:', toSave);
  exportToCsv('test.csv', toSave);
}

function exportToCsv(filename, rows) {
  var processRow = function (row) {
    var finalVal = '';
    finalVal += row;
    finalVal += ',';
    // for (var j = 0; j < row.length; j++) {
    //   var innerValue = row[j] === null ? '' : row[j].toString();
    //   if (row[j] instanceof Date) {
    //     innerValue = row[j].toLocaleString();
    //   };
    //   var result = innerValue.replace(/"/g, '""');
    //   if (result.search(/("|,|\n)/g) >= 0)
    //     result = '"' + result + '"';
    //   if (j > 0)
    //       finalVal += ',';
    //   finalVal += result;
    // }
    return finalVal + '\n';
  };

  var csvFile = '';
  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
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
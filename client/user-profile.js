const React = require('react');
const store = require('./store');

const UserProfile = props => {
  const profile = store.getState().userProfile.profile;
  var disableFollowingBtn = store.getState().userProfile.followingBtn;
  if (profile.id == '-1') return null; // if there is no profile loaded, do not show

  const profileLink = 'http://www.instagram.com/' + profile.username;
  
  const handleGetFollowing = event => {
    store.dispatch({
      type: 'DISABLE_FOLLOWING',
      show: true
    })
    fetch('/get-following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    })
  }

  return (
    <div className='ui eight column centered row'>
      <div>
        <div>
          <a href={ profileLink }>
            <img className='ui small image centered column' src={ profile.picture_url } />
          </a>
        </div>
        <div>
          <ul className="ui list">
            <li>User Name: { profile.username }</li>
            <li>User ID: { profile.external_id }</li>
            <li>Followers: { profile.follower_count }</li>
            <li>Following: { profile.following_count }</li>
            <li>Posts: { profile.post_count }</li>
          </ul>
        </div>
      </div>
      <div className='ui four column centered row'>
        <p>{ profile.bio }</p>
        <button
          className='ui button analyzebtn'
          disabled={ disableFollowingBtn }
          onClick={ handleGetFollowing }>Get Following</button>
      </div>
    </div>
  )
}

module.exports = UserProfile;
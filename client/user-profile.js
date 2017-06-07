const React = require('react');
const store = require('./store');
const async = require('async');

const UserProfile = props => {
  const profile = store.getState().userProfile;
  
  if (!profile.id) return null; // if there is no profile loaded, do not show

  const profileLink = 'http://www.instagram.com/' + profile.username;
  
  const handleGetFollowing = event => {

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
            <li>Posts: { profile.post_count }</li>
          </ul>
        </div>
      </div>
      <div className='ui four column centered row'>
        <p>{ profile.bio }</p>
        <button
          className='ui button'
          onClick={ handleGetFollowing }>Get Following</button>
      </div>
    </div>
  )
}
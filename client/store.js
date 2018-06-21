const { createStore, combineReducers } = require('redux');
const https = require('https');
const async = require('async');

const loadCSV = (state = {}, action) => {
  switch (action.type) {
    case 'UPLOAD_LEADS':
      console.log('uploading to endpoint');
      const batches = batchLeads(action.leads, 100);
      async.eachSeries(batches, (batch, next) => {
        var uploadBatch = [];
        batch.forEach(lead => {
          uploadBatch.push({
            username: lead.instagram_username,
            sent_postinfo_email: true
          })
        })
        fetch('/update-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leads: uploadBatch
          })
        })
          .then(() => {
            next();
          })
          .catch(console.error)
      }, err => {
        console.log('finished');
        return state;
      })
      return state;
    case 'API_KEY_INPUT_CHANGED':
      state.key = action.key
      return state;
    default:
      return state;
  }
}

// const prospectParameters = (state = {parameters: defaultParameters, type: {}}, action) => {
//   switch (action.type) { // simplify Object.assign logic
//     case 'UPDATE_PARAMETERS': // will effectively merge incoming parameter object with existing, overwriting any changes
//       const newObj = Object.assign({}, state.parameters[action.name], action.parameters[action.name]);
//       const paramObj = {};
//       paramObj[action.name] = newObj;
//       return {parameters: Object.assign({}, state.parameters, paramObj), type: state.type};
//     case 'UPDATE_TYPE': // same as UPDATE_PARAMETER but just not as complex
//       const typeObj = Object.assign({}, state.type, action.parameters);
//       return { parameters: state.parameters, type: typeObj };
//     case 'RENDER_PARAMETER_OBJECT': // What happens when you hit go
//       fetch('/ui-analyze', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(state)
//       })
//       return state;
//     default:
//       return state;
//   }
// }

// const enrichCSV = (state = {}, action) => {
//   switch (action.type) {
//     case 'ENRICH_CSV':
//       fetch('/enrich', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(action.users)
//       });
//       return state;
//     case 'UPLOAD_PROSPECTS':
//       fetch('/preload-prospects', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ usernames: action.prospects, primaryUsername: action.primaryUsername })
//       });
//       return state;
//     default:
//       return state;
//   }
// }

// var easyFilterTest = {
//   user: {
//     username: '123chocula',
//     follower_count: 2048347,
//     following_count: 14,
//     post_count: 62,
//     recent_post_count: 12,
//     recent_like_count: 67123,
//     recent_comment_count: 524,
//     picture_url: 'https://instagram.fsnc1-4.fna.fbcdn.net/t51.2885-19/12230863_691359027630917_506377473_a.jpg',
//     bio: 'had dream I was king \n woke up, still king'
//   },
//   medias: [
//   ]
// }

// var scraped = false;

// const easyFilter = (state = easyFilterTest, action) => {
//   switch (action.type) {
//     case 'LOAD_USER':
//       if (!scraped) {
//         // scraped = true;
//         fetch('/load-user/' + action.username)
//           .then(resp => resp.json())
//           .then(data => {
//             easyFilterTest = data;
//           })
//       }
//       return state;
//     case 'REFRESH_USER':
//       return easyFilterTest;
//     default:
//       return state;
//   }
// }

// const prospectListTest = {
//   primaryUsername: '',
//   prospectId: '',
//   position: null
// }
// // state will have username, position
// const prospectList = (state = {}, action) => {
//   switch (action.type) {
//     case 'LOAD_PROSPECTS':
//       return state;
//     case 'NEXT_PROSPECT':
//       return state;
//     case 'PREVIOUS_PROSPECT':
//       return state;
//     case 'ACCEPT_PROSPECT':
//       return state;
//     case 'REJECT_PROSPECT':
//       return state;
//     case 'LABEL_AS_BRAND':
//       return state;
//     case 'LABEL_AS_CONSUMER':
//       return state;
//     case 'UPDATE_PROSPECT':
//       console.log('trying to update prospect:', action);
//       fetch('/update-prospect', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ id: action.id, params: action.params })
//       });
//       return state;
//     default:
//       return state;
//   }
// }

const batchLeads = (leads, batchSize = 500) => {
  return leads.map((lead, i) => {
    return i % batchSize === 0 ? leads.slice(i, i + batchSize) : null;
  }).filter(elem => { return elem; });
}
  // prospectParameters,
  // enrichCSV,
  // easyFilter,
  // prospectList
const reducer = combineReducers({
  loadCSV
});

const store = createStore(reducer);

module.exports = store;
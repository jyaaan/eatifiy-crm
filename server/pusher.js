const TfBridge = require('./tf-bridge');
const tfBridge = new TfBridge();
const FileHandler = require('./file-controller');
const fileHandler = new FileHandler();
const Prospect = require('./prospect');
const prospect = new Prospect();

const TF_USER_ID = '5436898817';
var ignore = [];
class Pusher {
  constructor() {
    // this.ignore = [];
  }

  ping() {
    // get oldest unposted collab
    prospect.getRecentSCPost(TF_USER_ID)
      .then(shortcode => {
        this.getOldestCollab(shortcode)
          .then(collab => {
            if (collab) {
              const parameters = processCreatePostJSON(collab);
              const filename = parameters.url.substring(parameters.url.lastIndexOf('/') + 1);
              fileHandler.downloadFile(parameters.url, filename)
                .then(result => {
                  prospect.createPost(result, parameters.caption)
                    .then(result => {
                      console.log('Post created for collaboration: ' + collab.brand_name +
                        ' - ' + collab.media.instagram_username);
                    })
                    .catch(err => {
                      console.error(err);
                      console.log('error encountered');
                      ignore.push(collab.id);
                      console.log(ignore);
                    })
                })
            } else {
              console.log('no new collabs to post!');
            }
          })
      })
  }

  // Returns hash of oldest un-posted collaboration to be fed directly into pusher.
  getOldestCollab(shortcode) {
    var collabs = [];
    var pusher = this;
    return new Promise((resolve, reject) => {
      function retrieve(page) {
        tfBridge.getCollaborations(page)
          .then(results => {
            if (results.length > 0) {
              results.forEach(collab => {
                collab.shortcode = extractSCFromLink(collab.media.link);
              });
              var filteredResults = results.filter(collab => {
                return ignore.indexOf(collab.id) == -1;
              });
              collabs = collabs.concat(filteredResults);
              const matchIndex = collabs.findIndex(collab => collab.shortcode == shortcode);
              console.log(matchIndex);
              if (matchIndex > -1) {
                resolve(matchIndex > 0 ? collabs[matchIndex - 1] : null);
              } else {
                retrieve(page + 1);
              }
            } else {
              resolve(collabs.slice(-1)[0]);
            }
          })
      }
      retrieve(1);
    })
  }

}

const extractSCFromLink = link => {
  return link.split('/').slice(-1)[0] !== '' 
  ? link.split('/').slice(-1)[0] 
  : link.split('/').slice(-2)[0];
}

// returns {caption: "", url: ""}
const processCreatePostJSON = json => {
  const timeNow = new Date();
  var caption = '📸Artist: @' + json.media.instagram_username + '\n' +
    'Partner: ' + json.brand_name + '\n' +
    'Digital on IG\n' +
    '640px x 640px\n' +
    '.\n' +
    '.\n' +
    '.\n' +
    'Visit @truefluence to form the best partnerships on earth!\n' +
    '.\n' +
    '.\n' +
    '.\n' +
    'SC:' + json.shortcode + '\n' +
    'postinfo.co/' + json.media.instagram_username + '\n' +
    json.media.caption;
  return {
    url: json.media.image_standard,
    caption: caption
  }
}

module.exports = Pusher;
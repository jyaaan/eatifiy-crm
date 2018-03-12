const TfBridge = require('tf-bridge');
const tfBridge = new TfBridge();
const FileHandler = require('file-handler');
const fileHandler = new FileHandler();
const TF_USER_ID = 12345678;

class Pusher {
  constructor() {
    this.oldestSC = this.getOldestSCPost();
  }

  ping() {
    // get oldest unposted collab
    var collab;
    if (collab) {
      const parameters = processCreatePostJSON(collab);
      const filename = parameters.url.substring(parameters.url.lastIndexOf('/') + 1);
      fileHandler.downloadFile(parameters.url, filename)
        .then(result => {
          prospect.createPost(result, parameters.caption)
          console.log('Post created for collaboration: ' + collab.brand_name + 
          ' - ' + collab.media.instagram_username);
        })
    }
  }

  // Returns short code of oldest post with short code present
  // Returns null if no post
  getOldestSCPost() {

  }

  // Returns hash of oldest un-posted collaboration to be fed directly into pusher.
  getOldestCollab() {
    return new Promise((resolve, reject) => {
      tfBridge.getCollaborations(1)
        .then(collabs => {
          const match = collabs.filter(collab => {
            return collab;
          })
        })
    })
  }

  extractSCFromLink(link) {
    //remove right most slash
    const truncLink;
    return truncLink.substring(truncLink.lastIndexOf('/') + 1);
  }
}

// returns {caption: "", url: ""}
const processCreatePostJSON = json => {
  var caption = '.\n' + json.brand_name + '\n' +
    '📸Partner: @' + json.media.instagram_username + '\n' +
    'Visit @truefluence to discover who talks to your target market\n' +
    '.\n' +
    '.\n' +
    '.\n' +
    json.media.caption + '\n' +
    'SC:' + json.media.shortcode + '\n' +
    'postinfo.co/' + json.media.instagram_username;

  return {
    url: json.media.image_standard,
    caption: caption
  }
}

module.exports = Pusher;
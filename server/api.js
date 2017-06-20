const request = require('request');

const API = function () {

}

API.prototype.send = (destinationURL, hash, data) => {
  request.post(
    destinationURL,
    { json: {hash: data}}, // Verify hash variable
    (err, res, body) => {
      if(!err && res.statusCose == 200) {
        console.log('Request received');
      }
    }
  )
}

module.exports = API;
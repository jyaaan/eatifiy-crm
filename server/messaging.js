const twilio = require('twilio');
const envs = require('../envs');
Object.assign(process.env, envs);
console.log('process.env:', process.env);

class Messaging {
  constructor() {
    console.log('env vars: ' + process.env.TWILIO_ACCOUNT_SID + ' , ' + process.env.TWILIO_AUTH_TOKEN)
    // this.twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // this.sentMessageCount = 0;
  }
  
  send(message) {
    // this.twilioClient.messages.create({
    //   to: process.env.MY_NUM,
    //   from: process.env.TWILIO_NUM,
    //   body: message
    // });
    // this.sentMessageCount++;
    console.log(message);
  }
}

module.exports = Messaging;
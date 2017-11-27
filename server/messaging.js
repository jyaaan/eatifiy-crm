const twilio = require('twilio');


class Messaging {
  constructor() {
    console.log(process.env.TWILIO_ACCOUNT_SID);
    this.twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.sentMessageCount = 0;
  }
  
  send(message) {
    this.twilioClient.messages.create({
      to: process.env.MY_NUM,
      from: process.env.TWILIO_NUM,
      body: message
    });
    this.sentMessageCount++;
    console.log(message);
  }
}

module.exports = Messaging;
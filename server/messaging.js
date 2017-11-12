const twilio = require('twilio');

class Messaging {
  constructor() {
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
  }
}

module.exports = Messaging;
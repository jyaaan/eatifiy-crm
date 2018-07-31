const twilio = require('twilio');


class Messaging {
  constructor() {
    this.twilioClient = new twilio();
    this.sentMessageCount = 0;
  }
  
  send(message) {
    this.twilioClient.messages.create({
      to: 7142935548,
      from: 9093774882,
      body: message
    });
    this.sentMessageCount++;
    console.log(message);
  }
}

module.exports = Messaging;
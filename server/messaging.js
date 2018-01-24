const twilio = require('twilio');


class Messaging {
  constructor() {
    // console.log(ACedcc03d72bf75acb1b6e95c6750590e3);
    this.twilioClient = new twilio('ACedcc03d72bf75acb1b6e95c6750590e3', 'ff2abed237244f14327aebf0b26f9381');
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
const path = require('path');
const watchify = require('watchify');
const express = require('express');
const bodyParser = require('body-parser');
const IG = require('./ig');

const publicPath = path.join(__dirname, '/public');
const staticMiddleware = express.static(publicPath);
const ig = new IG();
const app = express();
const currentSession = { initialized: false, session: {} };

app.use(staticMiddleware);
app.use(bodyParser.json());

app.post('/get-following', (req, res) => {

});

app.post('/get-suggested', (req, res) => {

});

const PORT = 5760;

app.listen(PORT, () => {
  console.log('listening on port:', PORT);
})
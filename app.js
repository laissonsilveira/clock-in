global.__CONFIG = require('./cfg');
const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');
const LOGGER = require('./utils/logger');
const PORT = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(helmet());

require('./model/db-factory');

app.use('/', require('./routes/api-route'));
app.use(express.static('public'));

app.listen(PORT, LOGGER.info(`Listening on PORT ${PORT}`));

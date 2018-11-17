const express = require('express');
const LOGGER = require('./logger');
const PORT = process.env.PORT || 3000;
const app = express();

app.use('/', require('./routes/index'));
app.use(express.static('public'));

app.listen(PORT, LOGGER.info(`Listening on PORT ${PORT}`));

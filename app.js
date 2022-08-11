global.__CONFIG = require('./cfg');
const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const LOGGER = require('./utils/logger');
const PORT = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(helmet());

// express-rate-limit
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    message:
        'Too many accounts created from this IP, please try again after an hour'
});
app.use(limiter);

app.use(function (req, res, next) {
    const allowedOrigins = ['https://clock-in-lrs.herokuapp.com', 'chrome-extension://knemeplbocmccfokehbnmmkcjdcmhbcc'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
        LOGGER.warn(`Origin ${origin} not allowed!`);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
    next();
});

require('./model/db-factory');

app.use('/', require('./routes/api-route'));
app.use(express.static('public'));

app.listen(PORT, LOGGER.info(`Listening on PORT ${PORT}`));

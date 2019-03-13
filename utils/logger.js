const moment = require('moment');
const winston = require('winston');

module.exports = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            timestamp,
            colorize: true
        })
    ]
});

function timestamp() {
    return `${moment().format('DD/MM/YY HH:mm:ss')}`;
}
const express = require('express');
const request = require('request');
const moment = require('moment');
const momentDurationFormatSetup = require('moment-duration-format');
momentDurationFormatSetup(moment);
const LOGGER = require('./logger');
const app = express();

const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

app.use(express.static('public'));

function decode(input) {
    let output = '';
    let chr1, chr2, chr3 = '';
    let enc1, enc2, enc3, enc4 = '';
    let i = 0;

    input = input.replace('Basic ', '').replace(/[^A-Za-z0-9+/=]/g, '');

    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }

        chr1 = chr2 = chr3 = '';
        enc1 = enc2 = enc3 = enc4 = '';

    } while (i < input.length);

    return output;
}

function normalizeHour(hour) {
    const hrs = hour.split(':');
    if ((hrs[0] === '07' && Number(hrs[1]) >= 55) || (hrs[0] === '08' && Number(hrs[1]) <= 5)) {
        hrs[0] = '08';
        hrs[1] = '00';
    } else if ((hrs[0] === '11' && Number(hrs[1]) >= 55) || (hrs[0] === '12' && Number(hrs[1]) <= 5)) {
        hrs[0] = '12';
        hrs[1] = '00';
    } else if (hrs[0] === '13' && Number(hrs[1]) >= 25 && Number(hrs[1]) <= 35) {
        hrs[0] = '13';
        hrs[1] = '30';
    } else if (hrs[0] === '17' && Number(hrs[1]) >= 25 && Number(hrs[1]) <= 35) {
        hrs[0] = '17';
        hrs[1] = '30';
    }
    return hrs;
}

function getType(dv, hour) {
    if (dv.extra && (dv.extra.includes(hour) || dv.extra.includes(`${hour}\t`))) return 'E';
    if (dv.extraAceleration && (dv.extraAceleration.includes(hour) || dv.extraAceleration.includes(`${hour}\t`))) return 'A';
    if (dv.positive.includes(hour) || dv.positive.includes(`${hour}\t`)
        || dv.negative.includes(hour) || dv.negative.includes(`${hour}\t`)) return 'P';
}

function getDuration(h_2, h_1, isFind) {
    return moment({ hour: h_2[0], minute: h_2[1] })
        .diff(moment({ hour: h_1[0], minute: h_1[1] }), 'm') * (isFind ? 2 : 1);
}

function formatMinutes(minutes) {
    return moment.duration(minutes, 'minutes').format('HH:mm', { trim: false });
}

function getHours(balanceHours, type) {
    return balanceHours.filter(h => h.type === type).reduce((sum, h) => sum + h.sum, 0);
}

function totalCalc(o) {
    if (o.divergences.length > 1) {
        o.totalMinutes = o.divergences.reduce((previousVal, currentVal) => previousVal + (currentVal.minutes || 0), 0);
        o.totalExtra = o.divergences.reduce((previousVal, currentVal) => previousVal + (currentVal.extraHour || 0), 0);
        o.totalExtraAceleration = o.divergences.reduce((previousVal, currentVal) => previousVal + (currentVal.extraHourAceleration || 0), 0);
    }
    else {
        o.totalMinutes = o.divergences[0].minutes || 0;
        o.totalExtra = o.divergences[0].extraHour || 0;
        o.totalExtraAceleration = o.divergences[0].extraHourAceleration || 0;
    }
    o.totalMinutesFormated = formatMinutes(o.totalMinutes);
    o.totalExtraFormated = formatMinutes(o.totalExtra);
    o.totalExtraAcelerationFormated = formatMinutes(o.totalExtraAceleration);
}

app.get('/clocks', (req, res, next) => {
    const authData = decode(req.headers.authorization).split(':');
    if (authData[0] === 'laisson' && authData[1] === ';lrs!23#') {
        LOGGER.info('Recuperando batidas salvas');
        const URL = `https://api.mlab.com/api/1/databases/heroku_59xpzcr6/collections/clock-in?apiKey=${process.env.MONGODB_API_KEY}`;
        request.get(URL, (err, response, body) => {
            if (err) throw err;
            body = JSON.parse(body);
            if (body && Array.isArray(body) && body.length > 0) {
                body.forEach(o => {
                    o.divergences.forEach(dv => {
                        const hours = dv.hours.split(' ');
                        const isDouble = dv.date.indexOf('Sábado') > -1 || dv.date.indexOf('Domingo') > -1 || dv.isHoliday;
                        const isExtraHour = Array.isArray(dv.extra) && dv.extra.length > 0;
                        const isExtraHourAceleration = Array.isArray(dv.extraAceleration) && dv.extraAceleration.length > 0;
                        const balanceHours = [];

                        if (hours.length === 2) {
                            const h01 = normalizeHour(hours[0]);
                            const h02 = normalizeHour(hours[1]);
                            balanceHours.push({
                                sum: getDuration(h02, h01, isDouble),
                                type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                            });
                        } else {
                            const h01 = normalizeHour(hours[0]);
                            const h02 = normalizeHour(hours[1]);
                            const h03 = normalizeHour(hours[2]);
                            const h04 = normalizeHour(hours[3]);
                            const h05 = hours.length > 4 && normalizeHour(hours[4]);
                            const h06 = hours.length > 5 && normalizeHour(hours[5]);

                            if (isDouble) {
                                balanceHours.push({
                                    sum: getDuration(h02, h01, isDouble),
                                    type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                                });
                                balanceHours.push({
                                    sum: getDuration(h04, h03, isDouble),
                                    type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                                });
                            } else {
                                balanceHours.push({
                                    sum: getDuration(['08', '00'], h01),
                                    type: getType(dv, hours[0])
                                });
                                balanceHours.push({
                                    sum: getDuration(h02, ['12', '00']),
                                    type: getType(dv, hours[1])
                                });
                                balanceHours.push({
                                    sum: getDuration(['13', '30'], h03),
                                    type: getType(dv, hours[2])
                                });
                                balanceHours.push({
                                    sum: getDuration(h04, ['17', '30']),
                                    type: getType(dv, hours[3])
                                });
                            }

                            if (h05 && h06) {
                                balanceHours.push({
                                    sum: getDuration(h06, h05, isDouble),
                                    type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                                });
                            }
                        }

                        dv.extraHour = getHours(balanceHours, 'E');
                        dv.extraHourAceleration = getHours(balanceHours, 'A');
                        dv.minutes = getHours(balanceHours, 'P');

                        dv.minutesFormated = formatMinutes(dv.minutes);
                        dv.extraHourFormated = formatMinutes(dv.extraHour);
                        dv.extraHourAcelerationFormated = formatMinutes(dv.extraHourAceleration);

                        dv.hoursWorked = formatMinutes(
                            (
                                dv.extraHour +
                                dv.extraHourAceleration +
                                dv.minutes +
                                (isDouble ? 0 : 480)
                            ) /
                            (isDouble ? 2 : 1)
                        );

                        dv.date = moment(dv.date.split(',')[1], ['DD-MM-YYYY']);
                    });

                    totalCalc(o);
                });
            }
            res.json(body);
        });
    } else {
        const err = new Error();
        err.status = 403;
        next(err);
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, LOGGER.info(`Listening on PORT ${PORT}`));
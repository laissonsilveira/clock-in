const router = require('express').Router();
const moment = require('moment');
const momentDurationFormatSetup = require('moment-duration-format');
momentDurationFormatSetup(moment);
const LOGGER = require('../utils/logger');
const DBHelper = require('../utils/db');
const { authentication } = require('../utils/helper');

router.post('/clocks', authentication, (req, res, next) => {
    const hours = req.body;
    // LOGGER.info(JSON.stringify(hours));
    const db = new DBHelper('clock-in');
    db.insertDoc(hours)
        .then(response => {
            LOGGER.debug(`Result insert: ${JSON.stringify(response)}`);
            res.end();
        })
        .catch(err => next(err));
});

router.delete('/clocks/:id', authentication, (req, res, next) => {
    const ID = req.params.id;
    if(ID) {
        const db = new DBHelper('clock-in');
        db.deleteDoc(ID)
            .then(() => {
                LOGGER.debug(`Registro '${ID}' deletado com sucesso`);
                res.end();
            })
            .catch(err => next(err));
    } else {
        res.end();
    }
});

router.get('/clocks', authentication, (req, res, next) => {
    LOGGER.info('Recuperando batidas salvas');
    const db = new DBHelper('clock-in');
    db.listDocs()
        .then(body => {
            if (body && Array.isArray(body) && body.length > 0) {
                body.forEach(o => {
                    o.divergences.forEach(dv => {
                        if (!dv.positive) dv.positive = [];
                        if (!dv.negative) dv.negative = [];
                        const hours = dv.dayOff ? ['08:00', '12:00', '13:30', '17:30'] : dv.hours.split(' ');
                        const isDouble = dv.date.indexOf('Sábado') > -1 || dv.date.indexOf('Domingo') > -1
                            || dv.date.indexOf('Saturday') > -1 || dv.date.indexOf('Sunday') > -1
                            || dv.isHoliday;
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
                                    sum: getDuration(h02, h01, isDouble, isExtraHour),
                                    type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                                });
                                balanceHours.push({
                                    sum: getDuration(h04, h03, isDouble, isExtraHour),
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
                                    sum: getDuration(h06, h05, isDouble, isExtraHour),
                                    type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                                });
                            }
                        }

                        if (dv.dayOff) {
                            balanceHours.push({
                                sum: -480,
                                type: 'P'
                            });
                        }

                        if (dv.middayOff) {
                            balanceHours.push({
                                sum: -240,
                                type: 'P'
                            });
                        }

                        dv.extraHour = getHours(balanceHours, 'E');
                        dv.extraHourAceleration = getHours(balanceHours, 'A');
                        dv.minutes = getHours(balanceHours, 'P');

                        dv.extraHourFormated = formatMinutes(dv.extraHour);
                        dv.extraHourAcelerationFormated = formatMinutes(dv.extraHourAceleration);
                        dv.minutesFormated = formatMinutes(dv.minutes);

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
        })
        .catch(err => next(err));
});

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
    if (dv.extra && dv.extra.includes(hour)) return 'E';
    if (dv.extraAceleration && dv.extraAceleration.includes(hour)) return 'A';
    if (dv.positive.includes(hour) || dv.negative.includes(hour)) return 'P';
}

function getDuration(h_2, h_1, isFind, isExtraHour) {
    return moment({ hour: h_2[0], minute: h_2[1] })
        .diff(moment({ hour: h_1[0], minute: h_1[1] }), 'm') * (isFind && !isExtraHour ? 2 : 1);
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

module.exports = router;

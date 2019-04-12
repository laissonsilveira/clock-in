const moment = require('moment');
const DBHelper = require('../utils/db');
const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function authentication(req, res, next) {
    const authData = _decode(req.headers.authorization).split(':');
    const db = new DBHelper('users');
    db.listDocs()
        .then(users => {
            let userFound;
            if (users && Array.isArray(users) && users.length > 0) {
                userFound = users.find(user => authData[0] === user.username && authData[1] === user.password);
            }

            if (!userFound) {
                const err = new Error();
                err.status = 403;
                next(err);
            } else {
                next();
            }
        })
        .catch(err => next(err));
}

function _decode(input) {
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

function _normalizeHour(hour) {
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

function _getType(dv, hour) {
    if (dv.extra && dv.extra.includes(hour)) return 'E';
    if (dv.extraAceleration && dv.extraAceleration.includes(hour)) return 'A';
    if (dv.positive.includes(hour) || dv.negative.includes(hour)) return 'P';
}

function _getDuration(h_2, h_1, isFind, isExtraHour) {
    return moment({ hour: h_2[0], minute: h_2[1] })
        .diff(moment({ hour: h_1[0], minute: h_1[1] }), 'm') * (isFind && !isExtraHour ? 2 : 1);
}

function _formatMinutes(minutes) {
    return moment.duration(minutes, 'minutes').format('HH:mm', { trim: false });
}

function _getHours(balanceHours, type) {
    return balanceHours.filter(h => h.type === type).reduce((sum, h) => sum + h.sum, 0);
}

function _totalCalc(o) {
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
    o.totalMinutesFormated = _formatMinutes(o.totalMinutes);
    o.totalExtraFormated = _formatMinutes(o.totalExtra);
    o.totalExtraAcelerationFormated = _formatMinutes(o.totalExtraAceleration);
}

const hoursCalculate = clockIn => {
    if (clockIn && Array.isArray(clockIn) && clockIn.length > 0) {
        clockIn.forEach(o => {
            o.divergences.forEach(dv => {
                if (!dv.positive)
                    dv.positive = [];
                if (!dv.negative)
                    dv.negative = [];
                const hours = dv.dayOff ? ['08:00', '12:00', '13:30', '17:30'] : dv.hours.split(' ');
                const isDouble = dv.date.indexOf('Sábado') > -1 || dv.date.indexOf('Domingo') > -1
                    || dv.date.indexOf('Saturday') > -1 || dv.date.indexOf('Sunday') > -1
                    || dv.isHoliday;
                const isExtraHour = Array.isArray(dv.extra) && dv.extra.length > 0;
                const isExtraHourAceleration = Array.isArray(dv.extraAceleration) && dv.extraAceleration.length > 0;
                const balanceHours = [];
                if (hours.length === 2) {
                    const h01 = _normalizeHour(hours[0]);
                    const h02 = _normalizeHour(hours[1]);
                    balanceHours.push({
                        sum: _getDuration(h02, h01, isDouble, isExtraHour || isExtraHourAceleration),
                        type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                    });
                }
                else {
                    const h01 = _normalizeHour(hours[0]);
                    const h02 = _normalizeHour(hours[1]);
                    const h03 = _normalizeHour(hours[2]);
                    const h04 = _normalizeHour(hours[3]);
                    const h05 = hours.length > 4 && _normalizeHour(hours[4]);
                    const h06 = hours.length > 5 && _normalizeHour(hours[5]);
                    if (isDouble) {
                        balanceHours.push({
                            sum: _getDuration(h02, h01, isDouble, isExtraHour || isExtraHourAceleration),
                            type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                        });
                        balanceHours.push({
                            sum: _getDuration(h04, h03, isDouble, isExtraHour || isExtraHourAceleration),
                            type: isExtraHour ? 'E' : isExtraHourAceleration ? 'A' : 'P'
                        });
                    }
                    else {
                        balanceHours.push({
                            sum: _getDuration(['08', '00'], h01),
                            type: _getType(dv, hours[0])
                        });
                        balanceHours.push({
                            sum: _getDuration(h02, ['12', '00']),
                            type: _getType(dv, hours[1])
                        });
                        balanceHours.push({
                            sum: _getDuration(['13', '30'], h03),
                            type: _getType(dv, hours[2])
                        });
                        balanceHours.push({
                            sum: _getDuration(h04, ['17', '30']),
                            type: _getType(dv, hours[3])
                        });
                    }
                    if (h05 && h06) {
                        balanceHours.push({
                            sum: _getDuration(h06, h05, isDouble, isExtraHour || isExtraHourAceleration),
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
                dv.extraHour = _getHours(balanceHours, 'E');
                dv.extraHourAceleration = _getHours(balanceHours, 'A');
                dv.minutes = _getHours(balanceHours, 'P');
                dv.extraHourFormated = _formatMinutes(dv.extraHour);
                dv.extraHourAcelerationFormated = _formatMinutes(dv.extraHourAceleration);
                dv.minutesFormated = _formatMinutes(dv.minutes);
                dv.hoursWorked = _formatMinutes((dv.extraHour +
                    dv.extraHourAceleration +
                    dv.minutes +
                    (isDouble ? 0 : 480)) /
                    (isDouble && !(isExtraHour || isExtraHourAceleration) ? 2 : 1));
                dv.date = moment(dv.date.split(',')[1], ['DD-MM-YYYY']);
            });
            _totalCalc(o);
        });
    }
    return clockIn;
};

module.exports = { authentication, hoursCalculate };
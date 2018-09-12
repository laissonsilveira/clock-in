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

function getDuration(h_2, h_1) {
    return moment({ hour: h_2[0], minute: h_2[1] }).diff(moment({ hour: h_1[0], minute: h_1[1] }), 'm');
}

function formatMinutes(minutes) {
    return moment.duration(minutes, 'minutes').format('HH:mm', { trim: false });
}

app.get('/documents', (req, res, next) => {
    const authData = decode(req.headers.authorization).split(':');
    if (authData[0] === 'laisson' && authData[1] === 'g00dFath3R') {
        LOGGER.info('Recuperando batidas salvas');
        const URL = `https://api.mlab.com/api/1/databases/heroku_59xpzcr6/collections/clock-in?apiKey=${process.env.MONGODB_API_KEY}`;
        request.get(URL, (err, response, body) => {
            if (err) throw err;
            body = JSON.parse(body);
            if (body && Array.isArray(body) && body.length > 0) {
                body.forEach(o => {
                    o.divergences.forEach(dv => {
                        const hours = dv.hours.split(' ');
                        const h01 = normalizeHour(hours[0]);
                        const h02 = normalizeHour(hours[1]);
                        const h03 = normalizeHour(hours[2]);
                        const h04 = normalizeHour(hours[3]);
    
                        const duration01 = getDuration(h02, h01);
                        const duration02 = getDuration(h04, h03);
    
                        let minutes = duration01 + duration02;
    
                        if (hours.length > 4) {
                            const h05 = normalizeHour(hours[4]);
                            const h06 = normalizeHour(hours[5]);
    
                            const duration03 = getDuration(h06, h05);
                            minutes += duration03;
                        }
    
                        //480 = 8hours
                        dv.minutes = minutes - 480;
                        dv.minutesFormated = formatMinutes(dv.minutes);
                        dv.date = moment(dv.date.split(',')[1], ['DD-MM-YYYY']);
                    });
    
                    if (o.divergences.length > 1) {
                        o.totalMinutes = o.divergences.reduce((previousVal, currentVal) => previousVal.minutes + currentVal.minutes);
                    } else {
                        o.totalMinutes = o.divergences[0].minutes;
                    }
                    o.totalMinutesFormated = formatMinutes(o.totalMinutes);
                });
            }
            res.json(body);
        });
        // res.json([{ '_id': { '$oid': '5b7efa545d0e653eccd6deaa' }, 'status': 'OK', 'date_created': '2018-08-23 15:17:15', 'divergences': [{ 'date': '2018-08-22T03:00:00.000Z', 'hours': '8:31 12:02 13:29 17:55', 'negative': ['8:31'], 'positive': ['17:55'], 'minutes': -6, 'minutesFormated': '-00:06' }], 'totalMinutes': -6, 'totalMinutesFormated': '-00:06' }, { '_id': { '$oid': '5b7c2b0f1f6e4f0b47ad338d' }, 'status': 'OK', 'date_created': '2018-08-21 09:58:48', 'divergences': [{ 'date': '2018-08-20T03:00:00.000Z', 'hours': '8:21 12:09 12:32 17:42', 'negative': ['8:21'], 'positive': ['12:09', '12:32', '17:42'], 'minutes': 58, 'minutesFormated': '00:58' }], 'totalMinutes': 58, 'totalMinutesFormated': '00:58' }, { '_id': { '$oid': '5b7d5dcd5d0e657f28d08279' }, 'status': 'OK', 'date_created': '2018-08-22 09:56:57', 'divergences': [{ 'date': '2018-08-21T03:00:00.000Z', 'hours': '9:42 12:13 13:01 18:47', 'negative': ['9:42'], 'positive': ['12:13', '13:01', '18:47'], 'minutes': 17, 'minutesFormated': '00:17' }], 'totalMinutes': 17, 'totalMinutesFormated': '00:17' }, { '_id': { '$oid': '5b83ed5a5d0e653ecce83e17' }, 'status': 'OK', 'date_created': '2018-08-27 09:23:09', 'divergences': [{ 'date': '2018-08-23T03:00:00.000Z', 'hours': '9:07 12:05 12:26 17:32', 'negative': ['9:07'], 'positive': ['12:26'], 'minutes': -3, 'minutesFormated': '-00:03' }], 'totalMinutes': -3, 'totalMinutesFormated': '-00:03' }, { '_id': { '$oid': '5b869d4d1f6e4f79c185f004' }, 'status': 'OK', 'date_created': '2018-08-29 10:18:22', 'divergences': [{ 'date': '2018-08-28T03:00:00.000Z', 'hours': '8:53 12:04 12:35 18:08', 'negative': ['8:53'], 'positive': ['12:35', '18:08'], 'minutes': 40, 'minutesFormated': '00:40' }], 'totalMinutes': 40, 'totalMinutesFormated': '00:40' }, { '_id': { '$oid': '5b87ff5b5d0e653f4a19797c' }, 'status': 'OK', 'date_created': '2018-08-30 11:28:57', 'divergences': [{ 'date': '2018-08-29T03:00:00.000Z', 'hours': '9:30 12:00 13:01 17:33', 'negative': ['9:30'], 'positive': ['13:01'], 'minutes': -61, 'minutesFormated': '-01:01' }], 'message': '- Divergência(s) salva(s) com sucesso!', 'totalMinutes': -61, 'totalMinutesFormated': '-01:01' }, { '_id': { '$oid': '5b8943671f6e4f0502f00b6c' }, 'status': 'OK', 'date_created': '2018-08-31 10:31:33', 'divergences': [{ 'date': '2018-08-30T03:00:00.000Z', 'hours': '8:40 11:55 12:20 17:58', 'negative': ['8:40'], 'positive': ['12:20', '17:58'], 'minutes': 58, 'minutesFormated': '00:58' }], 'message': '- Divergência(s) salva(s) com sucesso!', 'totalMinutes': 58, 'totalMinutesFormated': '00:58' }, { '_id': { '$oid': '5b8d2b7c5d0e656b667aa98d' }, 'status': 'OK', 'date_created': '2018-09-03 09:39:08', 'divergences': [{ 'date': '2018-08-31T03:00:00.000Z', 'hours': '8:57 11:55 12:48 15:28 16:00 19:00', 'negative': ['8:57', '15:28', '16:00'], 'positive': ['12:48', '19:00'], 'minutes': 43, 'minutesFormated': '00:43' }], 'message': '- Divergência(s) salva(s) com sucesso!', 'totalMinutes': 43, 'totalMinutesFormated': '00:43' }, { '_id': { '$oid': '5b8fdf465d0e656b668de580' }, 'status': 'OK', 'date_created': '2018-09-05 10:49:42', 'divergences': [{ 'date': '2018-09-03T03:00:00.000Z', 'hours': '\n8:30 13:00 14:00 18:40', 'negative': ['8:30', '14:00'], 'positive': ['13:00', '18:40'], 'minutes': 70, 'minutesFormated': '01:10' }], 'message': '- Divergência(s) salva(s) com sucesso!', 'totalMinutes': 70, 'totalMinutesFormated': '01:10' }, { '_id': { '$oid': '5b8542865d0e653eccf035da' }, 'status': 'OK', 'date_created': '2018-08-28 09:38:45', 'divergences': [{ 'date': '2018-08-27T03:00:00.000Z', 'hours': '8:39 12:46 13:11 18:19', 'negative': ['8:39'], 'positive': ['12:46', '13:11', '18:19'], 'minutes': 75, 'minutesFormated': '01:15' }], 'totalMinutes': 75, 'totalMinutesFormated': '01:15' }]);
    } else {
        const err = new Error();
        err.status = 403;
        next(err);
    }
    
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, LOGGER.info(`Listening on PORT ${PORT}`));
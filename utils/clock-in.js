const moment = require('moment');
const momentDurationFormatSetup = require('moment-duration-format');
momentDurationFormatSetup(moment);

const WEEKEND_DAYS = ['sábado', 'domingo', 'saturday', 'sunday'];
const workedHours = new Map();
workedHours.set('6', { clocks: ['09:00', '12:00', '13:30', '16:30'], minutes: 360 });
workedHours.set('8', { clocks: ['09:00', '12:00', '13:00', '18:00'], minutes: 480 });
workedHours.set('8.8', { clocks: ['09:00', '12:00', '13:00', '18:48'], minutes: 528 });

class ClockIn {

    constructor(clockIn, tolerance = 'true') {
        this.clockIn = clockIn;
        this.toUseTolerance = tolerance;
    }

    hoursCalculate() {
        for (let index = 0; index < this.clockIn.length; index++) {
            this.balanceHours = [];
            this.divergence = this.clockIn[index];
            this.divergence.totalWorked = 0;
            this.divergence.isWeekend = WEEKEND_DAYS.includes(this.divergence.date.split(',')[0].toLowerCase());
            if (!this.divergence.worked_hours) this.divergence.worked_hours = '8';
            if (!this.divergence.positive) this.divergence.positive = [];
            if (!this.divergence.negative) this.divergence.negative = [];
            const hours = this.divergence.dayOff
                ? workedHours.get(this.divergence.worked_hours).clocks
                : this.divergence.hours.split(' ');

            this._setDate();

            if (hours.length === 1 || hours.length === 3 || hours.length === 5) {
                const date = this.divergence.date;
                const is8Clock = this.divergence.worked_hours === '8';
                const is88Clock = this.divergence.worked_hours === '8.8';
                const now = moment();
                const endWork = moment(`${date.format('YYYY-MM-DD')} ${is8Clock ? '18:00' : is88Clock ? '18:48' : '16:30'}`);
                const endDay = date.endOf('day');
                const hour = now.format('HH:mm');
                hours.push(hour);

                if (now.isAfter(endWork)) {
                    this.divergence.positive.push(hour);
                } else {
                    this.divergence.negative.push(hour);
                }

                if (now.isAfter(endDay)) {
                    this.divergence.nextDay.push(hour);
                }
            }

            if (hours.length === 2) {
                this._calculateTwoHours(hours);
            } else if (hours.length === 4 || hours.length === 6) {
                this._calculateFourOrSixHours(hours);
            }

            if (this.divergence.dayOff)
                this.balanceHours.push({
                    sum: -workedHours.get(this.divergence.worked_hours).minutes,
                    type: 'P'
                });
            if (this.divergence.middayOff)
                this.balanceHours.push({
                    sum: -(workedHours.get(this.divergence.worked_hours).minutes / 2),
                    type: 'P'
                });

            this._setHours();
            this._setFormatedHours();
        }

        const clockInSorted = this.clockIn.sort(ClockIn._compareDivergenceDate);
        return this._totalCalc(clockInSorted);
    }

    static _compare(d01, d02) {
        if (d01.isBefore(d02)) return 1;
        if (d01.isAfter(d02)) return -1;
        return 0;
    }

    static _compareDivergenceDate(d01, d02) {
        return ClockIn._compare(d01.date, d02.date);
    }

    _normalizeHour(hour) {
        const init = '09';
        const is8Clock = this.divergence.worked_hours === '8';
        const is88Clock = this.divergence.worked_hours === '8.8';
        const end = is8Clock || is88Clock ? '18' : '16';

        const hrs = hour.split(':');
        if (this.toUseTolerance === 'true') {
            if ((hrs[0] === '09' && Number(hrs[1]) >= 55) || (hrs[0] === init && Number(hrs[1]) <= 5)) {
                hrs[0] = init;
                hrs[1] = '00';
            } else if ((hrs[0] === '11' && Number(hrs[1]) >= 55) || (hrs[0] === '12' && Number(hrs[1]) <= 5)) {
                hrs[0] = '12';
                hrs[1] = '00';
            } else if ((hrs[0] === '12' && Number(hrs[1]) >= 55) || (hrs[0] === '13' && Number(hrs[1]) <= 5)) {
                hrs[0] = '13';
                hrs[1] = '00';
            } else if ((hrs[0] === '18' && Number(hrs[1]) >= 43) || (hrs[0] === '18' && Number(hrs[1]) <= 53)) {
                hrs[0] = end;
                hrs[1] = is88Clock ? '48' : '00';
            }
        }
        return hrs;
    }

    _getType(hour) {
        if (Array.isArray(hour)) hour = hour.join(':');
        if (this.divergence.extra && this.divergence.extra.includes(hour)) return 'E';
        if (this.divergence.extraAceleration && this.divergence.extraAceleration.includes(hour)) return 'A';
        if (this.divergence.positive.includes(hour) || this.divergence.negative.includes(hour)) return 'P';
    }

    _getDuration(h_2, h_1) {
        if (h_1 && h_2) {
            const initialTime = moment({ hour: h_1[0], minute: h_1[1] });
            const endTime = moment({ hour: h_2[0], minute: h_2[1] });

            if (this.divergence.nextDay?.length) {
                if (this.divergence.nextDay.includes(h_1.join(':'))) initialTime.add(1, 'd');
                if (this.divergence.nextDay.includes(h_2.join(':'))) endTime.add(1, 'd');
            }

            return endTime.diff(initialTime, 'm') * this._getMultiple(h_2, h_1);
        }
    }

    _getMultiple(h_2, h_1) {
        return (this._isDouble() && !this._isExtraHour(h_2, h_1) ? 2 : 1);
    }

    _isExtraHour(h01, h02) {
        if (Array.isArray(h01)) h01 = h01.join(':');
        if (Array.isArray(h02)) h02 = h02.join(':');

        let hour = h01;
        if (!this._isDouble() && workedHours.get(this.divergence.worked_hours).clocks.includes(h01)) hour = h02;

        const type = this._getType(hour);
        return ['E', 'A'].includes(type);
    }

    _formatMinutes(minutes) {
        return moment.duration(minutes, 'minutes').format('HH:mm', { trim: false });
    }

    _getHours(type) {
        return this.balanceHours.filter(h => h.type === type).reduce((sum, h) => sum + h.sum, 0);
    }

    _totalCalc(divergences) {
        const clockIn = {};
        if (divergences.length > 1) {
            clockIn.totalMinutes = divergences.reduce((previousVal, currentVal) => previousVal + (currentVal.minutes || 0), 0);
            clockIn.totalExtra = divergences.reduce((previousVal, currentVal) => previousVal + (currentVal.extraHour || 0), 0);
            // clockIn.totalExtraAceleration = divergences.reduce((previousVal, currentVal) => previousVal + (currentVal.extraHourAceleration || 0), 0);
        } else if (divergences.length) {
            clockIn.totalMinutes = divergences[0].minutes || 0;
            clockIn.totalExtra = divergences[0].extraHour || 0;
        }
        // clockIn.totalMinutesFormated = this._formatMinutes(clockIn.totalMinutes);
        // clockIn.totalExtraFormated = this._formatMinutes(clockIn.totalExtra);

        clockIn.divergences = divergences;

        return clockIn;
    }

    _setDate() {
        this.divergence.date = moment(this.divergence.date.split(',')[1], ['DD/MM/YYYY']);
    }

    _setFormatedHours() {
        this.divergence.extraHourFormated = this._formatMinutes(this.divergence.extraHour);
        this.divergence.extraHourAcelerationFormated = this._formatMinutes(this.divergence.extraHourAceleration);
        this.divergence.minutesFormated = this._formatMinutes(this.divergence.minutes);
        this.divergence.hoursWorked = this._formatMinutes(this._getHoursWorked());
    }

    _getHoursWorked() {
        const hoursInDay = (this._isDouble() ? 0 : workedHours.get(this.divergence.worked_hours).minutes);
        const hoursDB = (this._isDouble() ? this.divergence.minutes / 2 : this.divergence.minutes);
        return hoursInDay + this.divergence.extraHour + this.divergence.extraHourAceleration + hoursDB;
    }

    _setHours() {
        this.divergence.extraHour = this._getHours('E');
        this.divergence.extraHourAceleration = this._getHours('A');
        this.divergence.minutes = this._getHours('P');
    }

    _calculateFourOrSixHours(hours) {
        const h01 = this._normalizeHour(hours[0]);
        const h02 = this._normalizeHour(hours[1]);
        const h03 = this._normalizeHour(hours[2]);
        const h04 = this._normalizeHour(hours[3]);
        const h05 = hours.length > 4 && this._normalizeHour(hours[4]);
        const h06 = hours.length > 5 && this._normalizeHour(hours[5]);
        const morning = this._getDuration(h02, h01);
        const afternoon = this._getDuration(h04, h03);
        const night = this._getDuration(h06, h05);

        if (this._isDouble()) {
            this.balanceHours.push({
                sum: morning,
                type: this._getType(h01)
            });
            this.balanceHours.push({
                sum: afternoon,
                type: this._getType(h03)
            });
        }
        else {
            const is8Clock = this.divergence.worked_hours === '8';
            const is88Clock = this.divergence.worked_hours === '8.8';

            const init = '09';
            const end = is8Clock || is88Clock ? '18' : '16';

            this.balanceHours.push({
                sum: this._getDuration([init, '00'], h01),
                type: this._getType(h01)
            });
            this.balanceHours.push({
                sum: this._getDuration(h02, ['12', '00']),
                type: this._getType(h02)
            });
            this.balanceHours.push({
                sum: this._getDuration(['13', '00'], h03),
                type: this._getType(h03)
            });
            this.balanceHours.push({
                sum: this._getDuration(h04, [end, is88Clock ? '48' : '00']),
                type: this._getType(h04)
            });
        }
        if (night) {
            this.balanceHours.push({
                sum: night,
                type: this._getType(h05)
            });
        }
        this.divergence.totalWorked = (morning || 0) + (afternoon || 0) + (night || 0);
    }

    _calculateTwoHours(hours) {
        const h01 = this._normalizeHour(hours[0]);
        const h02 = this._normalizeHour(hours[1]);
        const duration = this._getDuration(h02, h01);
        let type = this._getType(h01);
        if (!type) type = this._getType(h02);
        this.divergence.totalWorked = duration || 0;

        if (this._isDouble() || this.divergence.dayOff || this.divergence.middayOff)
            this.balanceHours.push({ sum: duration, type });
        else
            this.balanceHours.push({
                sum: -(workedHours.get(this.divergence.worked_hours).minutes - duration),
                type: 'P'
            });
    }

    _isDouble() {
        return this.divergence.isWeekend || !!this.divergence.isHoliday;
    }
}

module.exports = ClockIn;

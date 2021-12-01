const { expect } = require('chai');
const mocks = require('./mockdb-clock-in');
const ClockIn = require('../utils/clock-in');
const { testName } = require('yargs').argv;

describe('Cálculo de horas extras trabalhadas', () => {
    for (const mock of mocks) {
        if (!mock.it) continue;
        if (testName && !mock.it.includes(testName)) continue;
        it(mock.it, () => {
            const clockIn = new ClockIn(mock.test.in).hoursCalculate();
            expect(clockIn).to.be.a('object');
            expect(clockIn).to.have.property('divergences').a('array').length(1);
            expect(clockIn.divergences[0]).deep.include(mock.test.out.divergences[0]);
            expect(clockIn).to.have.property('totalExtra').a('number').equal(mock.test.out.totalExtra);
            expect(clockIn).to.have.property('totalMinutes').a('number').equal(mock.test.out.totalMinutes);
        });
    }
});

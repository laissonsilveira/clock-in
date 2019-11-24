const { expect } = require('chai');
const mocks = require('./mockdb-clock-in');
const ClockIn = require('../utils/clock-in');
const { testName } = require('yargs').argv;

describe('Cálculo de horas extras trabalhadas', () => {
    for (const mock of mocks) {
        if (!mock.it) continue;
        if (testName && !mock.it.includes(testName)) continue;
        it(mock.it, () => {
            const clockIn = new ClockIn(mock.test.in).hoursCalculate()[0];
            for (const index in clockIn.divergences) {
                include(clockIn.divergences[index], mock.test.out.calc[index]);
            }
            include(clockIn, mock.test.out.total);
        });
    }
});

function include(value, expected) {
    expect(value).to.be.a('object');
    expect(value, `${JSON.stringify(value)}`).to.include(expected);
}

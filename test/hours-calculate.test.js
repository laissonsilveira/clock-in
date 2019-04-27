const { expect } = require('chai');
const mocks = require('./mockdb-clock-in');
const ClockIn = require('../utils/clock-in');

describe('Cálculo de horas extras trabalhadas', () => {
    for (const mock of mocks) {
        if (!mock.it) continue;
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
    // console.log(value);
    expect(value).to.be.a('object');
    expect(value).to.include(expected);
}

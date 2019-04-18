const { expect } = require('chai');
const { hoursCalculate } = require('../utils/helper');
const mocks = require('./mockdb-clock-in');

describe('Cálculo de horas extras trabalhadas', () => {
    for (const mock of mocks) {
        it(mock.it, () => {
            const clockin = hoursCalculate(mock.test.in)[0];
            for (const index in clockin.divergences) {
                include(clockin.divergences[index], mock.test.out.calc[index]);
            }
            include(clockin, mock.test.out.total);
        });
    }
});

function include(value, expected) {
    expect(value).to.be.a('object');
    expect(value).to.include(expected);
}

module.exports = {
    include: [
        'utils/*.js'
    ],
    all: false,
    reporter: ['text', 'text-summary', 'html', 'json-summary', 'json'],
    'report-dir': 'test/reports/coverage'
};
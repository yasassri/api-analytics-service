// Holds constant values required

const GRANULARITY = Object.freeze({
    // SECOND: 'second',
    // MINUTE: 'minute',
    HOUR: 'hour',
    DAY: 'day',
    // MONTH: 'month',
    // YEAR: 'year'
});

const PERCENTILE_TABLES = Object.freeze({
    MINUTE: 'ApiLatencyPercentiles_MINUTES',
    HOUR: 'ApiLatencyPercentiles_HOURS',
    DAY: 'ApiLatencyPercentiles_DAYS',
    MONTH: 'ApiLatencyPercentiles_MONTHS',
    YEAR: 'ApiLatencyPercentiles_YEARS'
});

module.exports = { GRANULARITY, PERCENTILE_TABLES }
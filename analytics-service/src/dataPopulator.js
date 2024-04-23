const sql = require('mssql');
const { GRANULARITY, PERCENTILE_TABLES } = require("./Constants")
const { round } = require("./utils/Utils");
const { SQL_CONFIG, getDBPool } = require('./dal/db')
const { log } = require('./utils/logger');

const apiList = ['TransactionAPI', 'CoverageAPI', 'LocationAPI', 'PaymentAPI', 'TrackingAPI']
const appList = ['MobileAPP', 'PartnerApp', 'CustomerApp']
const maxRecords = 1000;

const granularityList = [GRANULARITY.HOUR, GRANULARITY.DAY]

let pool;
const DATA_TABLE = 'ApiLatencyTimeByApp_SECONDS'

async function summerizeAnalyticsData() {
    log.info("Starting the Data Summarization Process!!!");

    log.info("Environment parameters validated, starting summarization");
    log.info("Environment: " + process.env.ENVIRONMENT);
    log.info("Time: " + Date.now().get);

    //process.env.USER_ID
    // SQL_CONFIG.user = USERNAME;
    // SQL_CONFIG.password = Buffer.from(PASSWORD, 'base64').toString('utf-8'); // There are special characters in the password, hence this is passed as Base64 encoded
    // SQL_CONFIG.server = HOST;
    // SQL_CONFIG.port = Number(PORT);
    // wait for the connection pool to initialize
    pool = await getDBPool();

    let errorOccurred = false;
    for (let gran of granularityList) {
        log.info(">>>>>>>>>>>>> Start Processing Granularity " + gran + " <<<<<<<<<<<<<<<");
        for (let apiName of apiList) {
            try {
                log.info(":::::::::::::: Start Processing API " + apiName + " ::::::::::::::::::");
                let startTime = await getStartTime(gran, apiName);
                let endTime = await getEndTime(gran);

                for (let appId of appList) {
                    log.info("||||||| Start Processing Application " + appId);
                    await summarizeData(apiName, appId, startTime, endTime, gran);
                    log.info("||||||| End Processing Application " + appId);
                }
            } catch (error) {
                // To make sure we go through all the APIs although one fails.
                log.error(error);
                errorOccurred = true;
            }
            log.info(":::::::::::::: End Processing API " + apiName + " ::::::::::::::::::");
        }
        log.info(">>>>>>>>>>>>> Finished Processing Granularity " + gran + " <<<<<<<<<<<<<<<");
    }

    if (errorOccurred) {
        // We need to fail the GH Workflow
        throw new Error("Some error occurred check the logs!!!")
    }

    // pool.end((err) => {
    //     if (err) {
    //       log.error('Error ending pool:', err);
    //       return;
    //     }
    //     log.info('Pool ended');
    //   });
    log.info("Complete")
}

async function summarizeData(apiName, appId, startTime, endTime, granularity) {
    log.info("Calculating percentile for " + apiName + " AppId: " + appId + " from: " + startTime + " To: " + endTime + " with the granularity " + granularity);
    let percentileTableName = getPercentileTableName(granularity);
    let timeOffset = getTimeOffset(granularity);
    let time = startTime;
    log.info("Time offset: " + timeOffset + " TableName: " + percentileTableName);
    while (time < endTime) {

        let record = generateDataRow(20, 15000); // Passing min and max time in millis

        let calcPercentilesAndInsert = `INSERT INTO ${percentileTableName} (AGG_TIMESTAMP, applicationId, applicationName, apiName, p95, p99, eventCount, averageResponse, maxResponseTime, minResponseTime)
        VALUES (${time}, '${appId}', '${appId}', '${apiName}', ${record.p95}, ${record.p99}, ${record.count}, ${record.average}, ${record.max}, ${record.min});`

        log.debug("QUERY::::" + calcPercentilesAndInsert);
        let [rows, fields] = await pool.query(calcPercentilesAndInsert);
        time += timeOffset;
    }
}


async function getStartTime(granularity, apiName) {
    // We will retrieve the time the last aggregation happened as the starttime from the DB
    let tableName = getPercentileTableName(granularity);
    log.debug("The summarizing table: " + tableName);
    try {
        const getTimeQuery = `SELECT AGG_TIMESTAMP AS aggregationTimeStamp \
                                FROM ${tableName} \ 
                                WHERE apiName = '${apiName}' \
                                ORDER BY AGG_TIMESTAMP DESC LIMIT 1;`;
        log.debug("Last Time Query::::" + getTimeQuery);
        const [results] = await pool.query(getTimeQuery);
        log.debug("TIME RESULT::::" + JSON.stringify(results))
        
        
        
        let startTime;
        if (results.length == 0) {
            log.info("Calculating a start time since DB is Empty. Probably this is the first time this code is run against the DB");
            // If records are null this means this is the first time we are summarizing, so we backdate 5 days and start from there.
            startTime = getEndTime(granularity) - (1 * 24 * 60 * 60 * 1000);
        } else {
            startTime = Number(results[0].aggregationTimeStamp) + getTimeOffset(granularity);
        }
        log.info("The Start Time : " + startTime);
        return startTime;
    } catch (err) {
        log.error(err)
        throw new Error("Error occurred while getting the start time");
    }
}

function getEndTime(granularity) {
    // We are returning the closest epoch time with the provided granularity
    // Adding a 5 second offset to make sure we have everything persisted in the Analytics DB
    let currentTime = Date.now() - 5000;
    let time = currentTime - (currentTime % getTimeOffset(granularity));
    log.debug("End time " + time);
    // Always return the millisecond value
    if (String(time).length != 13) {
        throw new Error("The Length of the timestamp is not correct " + time);
    }
    return time;
}

// Depending on the time off set stepping up the time. 
function getPercentileTableName(granularity) {
    switch (granularity) {
        case GRANULARITY.MINUTE:
            return PERCENTILE_TABLES.MINUTE;
        case GRANULARITY.HOUR:
            return PERCENTILE_TABLES.HOUR;
        case GRANULARITY.DAY:
            return PERCENTILE_TABLES.DAY;
        default:
            throw new Error("The Granularity is not yet implemented! " + granularity);
    }
}

// Depending on the time off set stepping up the time. 
function getTimeOffset(granularity) {
    const MINUTES_OFFSET = 60000;
    const HOUR_OFFSET = 3600000; // 60 * 60 * 1000 in millis
    const DAY_OFFSET = 86400000;

    switch (granularity) {
        case GRANULARITY.MINUTE:
            return MINUTES_OFFSET;
        case GRANULARITY.HOUR:
            return HOUR_OFFSET;
        case GRANULARITY.DAY:
            return DAY_OFFSET
        default:
            throw new Error("The Granularity is not yet implemented!");
    }
}

function sortArray(arr) {
    return arr.sort(function (a, b) {
        return a - b;
    });
}

// This function generates random data set to be inderted to the summerized table
function generateDataRow(min, max) {
    let numbers = [];
    let sum = 0;
    let forceThreshold = 2000;
    
    //Generate a number between 1000 and 150
    let count = Math.floor(Math.random() * (1000 - 150 + 1)) + 150;
    
    // // Generate random numbers
    for (let i = 0; i < count; i++) {
        const randomNumber = Math.random();
        let result;
        if (randomNumber < 0.9) {
            // Generate a number between X and Y/5 (85% of the time)
            result = Math.floor(Math.random() * (forceThreshold - min + 1)) + min;
        } else {
            // Generate a number between Y/5 and Y (15% of the time)
            result = Math.floor(Math.random() * (max - forceThreshold + 1)) + forceThreshold;
        }
        numbers.push(result);
        sum += result;
    }

    arr = sortArray(numbers);

    // Calculate min, max, and average
    let minValue = arr[0];
    let maxValue = arr[arr.length - 1];
    let averageValue = sum / count;

    return {
        count: count,
        min: minValue,
        max: maxValue,
        average: round(averageValue),
        p95: round(p(arr, 0.95)),
        p99: round(p(arr, 0.99))
    };
}

// Calculates the percentiles of an array
function p(arr, p) {

    const pos = (arr.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
    } else {
        return arr[base];
    }
}

module.exports = summerizeAnalyticsData

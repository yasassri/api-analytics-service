const sql = require("mssql");
const { getDBPool, SQL_CONFIG } = require("../dal/db");
const { round } = require("../utils/Utils");
const { log } = require("../utils/logger");
const { GRANULARITY, PERCENTILE_TABLES } = require("../Constants");

async function getApplicationAnalytics( granularity, apiName, startTime, endTime) {
  log.debug(
    "Getting Application Analytics. API : " +
    apiName +
    " StartTime: " +
    startTime +
    " Endtime: " +
    endTime +
    " Granularity: " +
    granularity
  );
  let applicationNames = [];
  let applicationIds = [];
  let applicationMap = {};
  let applicationAvgResponseTime = [];
  let applicationAngles = [];

  let pool;
  const APIM_DB_APP_TABLE = "dbApim.dbo.AM_APPLICATION";
  try {
    pool = await getDBPool();
    const tableName = getTableName(granularity);
    const summaryFetchQuery = `SELECT applicationId, applicationName, CAST(SUM(eventCount) AS SIGNED) AS reqCount, ROUND(AVG(averageResponse), 2) AS averageResponse, MIN(minResponseTime) AS minResponseTime, MAX(maxResponseTime) AS maxResponseTime                                
                                FROM ${tableName} WHERE apiName = '${apiName}' AND AGG_TIMESTAMP <= ${endTime} AND AGG_TIMESTAMP >= ${startTime}
                                GROUP BY applicationId, applicationName;`;
    log.debug("Summary fetch Query: " + summaryFetchQuery);
    // Sometime the users may be using the Default Application, hence retrieving the Application owner details to make sure we can differentiate the App.
    const [results] = await pool.query(summaryFetchQuery);

    log.info("Summarized Application Data: " + JSON.stringify(results));

    return results;
  } catch (err) {
    log.error(err);
    throw new Error(
      "Error while summarizing the data for the complete time window"
    );
  }
}

async function getLatencyData(granularity, apiName, startTime, endTime) {
  const tableName = getTableName(granularity);
  return new Promise((resolve, reject) => {
    var processMap = new Map();
    //Processing the heavy data with SQL streaming
    log.info("Start Processing Latency Data.");
    sql.connect(SQL_CONFIG, (err) => {
      if (err) {
        log.info("Error occured, handle");
      }
      const request = new sql.Request();
      request.stream = true;
      const latencyDataQuery = `SELECT AGG_TIMESTAMP AS aggregationTimeStamp, applicationId, applicationName, averageResponse, eventCount AS reqCount, minResponseTime, maxResponseTime, p95, p99
                                FROM ${tableName}
                                WHERE apiName = '${apiName}' AND AGG_TIMESTAMP <=  ${endTime} AND AGG_TIMESTAMP >= ${startTime}
                                ORDER BY AGG_TIMESTAMP ASC`;
      log.debug("Latency Query: " + latencyDataQuery);
      request.query(latencyDataQuery);

      request.on("recordset", (columns) => {
        log.info("Record Set Received");
      });

      request.on("row", (row) => {
        //log.info("Row : " + JSON.stringify(row));
        // First we group rows by application
        if (processMap.has(row.applicationId)) {
          processMap.get(row.applicationId).push(row);
        } else {
          processMap.set(row.applicationId, [row]);
        }
      });

      request.on("rowsaffected", (rowCount) => {
        log.info("Total rows to be processed " + JSON.stringify(rowCount));
      });

      request.on("error", (err) => {
        log.info("Error occurred " + err);
        reject(err);
      });

      request.on("done", async (result) => {
        // Always emitted as the last one
        log.info("Done " + JSON.stringify(result));
        log.info(
          "Total Applications To be processes : " +
          JSON.stringify(processMap.size)
        );
        var data = await processRows(processMap);
        sql.close();
        resolve(data);
      });
    });

    sql.on("error", (err) => {
      log.error("DB error occurred while processing latency data! " + err);
      reject(err);
    });
  });
}

async function processRows(processMap) {
  let fullDataSet = new Map();

  const TIMESTAMP_MAP_NAME = "timeStamps";
  const MIN_RES_MAP_NAME = "minResponses";
  const AVG_RES_MAP_NAME = "averageResponses";
  const MAX_RES_MAP_NAME = "maxResponses";
  const REQ_CONT_MAP_NAME = "requestCounts";
  const P95_MAP_NAME = "p95";
  const P99_MAP_NAME = "p99";

  for (let [key, value] of processMap.entries()) {
    log.info("Processing records for Application: " + key);

    fullDataSet.set(
      key,
      new Map([
        ["applicationName", value[0].applicationName],
        [TIMESTAMP_MAP_NAME, []],
        [MIN_RES_MAP_NAME, []],
        [AVG_RES_MAP_NAME, []],
        [MAX_RES_MAP_NAME, []],
        [REQ_CONT_MAP_NAME, []],
        [P95_MAP_NAME, []],
        [P99_MAP_NAME, []],
      ])
    );
    let i = 0;
    for (let record of value) {
      //log.info(record);
      //log.info("1:::: " + currentTime + " 2:::: " + record.aggregationTimeStamp)
      fullDataSet
        .get(key)
        .get(TIMESTAMP_MAP_NAME)
        .push(Number(record.aggregationTimeStamp));
      fullDataSet
        .get(key)
        .get(MIN_RES_MAP_NAME)
        .push(Number(record.minResponseTime));
      fullDataSet
        .get(key)
        .get(AVG_RES_MAP_NAME)
        .push(Number(record.averageResponse));
      fullDataSet
        .get(key)
        .get(MAX_RES_MAP_NAME)
        .push(Number(record.maxResponseTime));
      fullDataSet.get(key).get(REQ_CONT_MAP_NAME).push(Number(record.reqCount));
      fullDataSet.get(key).get(P95_MAP_NAME).push(Number(record.p95));
      fullDataSet.get(key).get(P99_MAP_NAME).push(Number(record.p99));
    }
  }
  log.info("Done processing the records!");
  // log.info(Object.fromEntries(fullDataSet));
  return fullDataSet;
}

// Depending on the time off set stepping up the time.
function getTableName(granularity) {
  switch (granularity) {
    case GRANULARITY.MINUTE:
      return PERCENTILE_TABLES.MINUTE;
    case GRANULARITY.HOUR:
      return PERCENTILE_TABLES.HOUR;
    case GRANULARITY.DAY:
      return PERCENTILE_TABLES.DAY;
    default:
      throw new Error("The Granularity is not yet implemented!");
  }
}

async function getLatencyJSONObj(granularity, apiName, startTimeD, endTimeD) {
  let latencyData = await getLatencyData(
    granularity,
    apiName,
    startTimeD,
    endTimeD
  );
  const rootObj = {};
  latencyData.forEach((value, key) => {
    let nestedObj = {};
    value.forEach((value2, key2) => {
      nestedObj[key2] = value2;
      rootObj[key] = nestedObj;
    });
  });

  return rootObj;
}

module.exports = { getApplicationAnalytics, getLatencyJSONObj };

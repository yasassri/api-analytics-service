
const { getDBPool, SQL_CONFIG } = require('../dal/db')
const { log } = require('../utils/logger');

const DATA_TABLE = 'ApiLatencyPercentiles_HOURS';
let pool;
async function initPool() {
    if(!pool) {
        pool = await getDBPool();
    }  
    // pool = await getDBPool();
}

async function getDistinctAPIs() {
    // pool = await getDBPool();
    try {
        await initPool();
        const getLastUpdateQuery = `SELECT DISTINCT apiName FROM ${DATA_TABLE}`;

        log.debug("Last update query : " + getLastUpdateQuery)
        const [results] = await pool.query(getLastUpdateQuery);
        let appList = [];
        results.forEach(element => {
            log.info(JSON.stringify(element))
            appList.push(element.apiName)
    });
    return appList;
        
    } catch (error) {
        log.error("Error occured while getting APIs: " + error)
        return []
    } 
    
}

async function getAPIList() {
    // throw new Error('An unexpected error occurred3333');
    let apis = await getDistinctAPIs();
    return apis
}

module.exports = {
    getAPIList
  }
const mysql = require('mysql2/promise');
const { log } = require('../utils/logger');

const { DB_HOST, DB_PORT, DB_USER, DB_PASS} = process.env;


const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  port: DB_PORT,
  // host: 'localhost',
  // user: 'root',
  // password: 'root123456',
  database: 'dbAnalytics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function getDBPool() {
  return pool;
}

module.exports = { getDBPool }
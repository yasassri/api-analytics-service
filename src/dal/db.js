const mysql = require('mysql2/promise');
const { log } = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'dbAnalytics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function getDBPool() {
  return pool;
}

module.exports = { getDBPool }
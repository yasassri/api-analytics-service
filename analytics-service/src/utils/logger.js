const winston = require('winston');

const log = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug', // We can pass the level as an environment variable for debugging.
    format: winston.format.cli(),
    transports: [new winston.transports.Console()]
  });

  module.exports = { log };
  
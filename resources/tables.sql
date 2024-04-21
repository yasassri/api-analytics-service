ApiLatencyPercentiles_MINUTESCREATE TABLE ApiLatencyPercentiles_MINUTES (
    AGG_TIMESTAMP BIGINT NOT NULL,
    applicationId VARCHAR(254) NOT NULL,
    applicationName VARCHAR(254) NOT NULL,
    apiName VARCHAR(254) NOT NULL,
    p95 FLOAT NOT NULL,
    p99 FLOAT NOT NULL,
    eventCount BIGINT NOT NULL,
    averageResponse FLOAT NOT NULL,
    maxResponseTime INT NOT NULL,
    minResponseTime INT NOT NULL,
    PRIMARY KEY (AGG_TIMESTAMP, applicationId, apiName)
);

CREATE INDEX idx_apiName_minutes ON ApiLatencyPercentiles_MINUTES (apiName);

CREATE TABLE ApiLatencyPercentiles_HOURS (
    AGG_TIMESTAMP BIGINT NOT NULL,
    applicationId VARCHAR(254) NOT NULL,
    applicationName VARCHAR(254) NOT NULL,
    apiName VARCHAR(254) NOT NULL,
    p95 FLOAT NOT NULL,
    p99 FLOAT NOT NULL,
    eventCount BIGINT NOT NULL,
    averageResponse FLOAT NOT NULL,
    maxResponseTime INT NOT NULL,
    minResponseTime INT NOT NULL,
    PRIMARY KEY (AGG_TIMESTAMP, applicationId, apiName)
);
CREATE INDEX idx_apiName_hours ON ApiLatencyPercentiles_HOURS (apiName);

CREATE TABLE ApiLatencyPercentiles_DAYS (
    AGG_TIMESTAMP BIGINT NOT NULL,
    applicationId VARCHAR(254) NOT NULL,
    applicationName VARCHAR(254) NOT NULL,
    apiName VARCHAR(254) NOT NULL,
    p95 FLOAT NOT NULL,
    p99 FLOAT NOT NULL,
    eventCount BIGINT NOT NULL,
    averageResponse FLOAT NOT NULL,
    maxResponseTime INT NOT NULL,
    minResponseTime INT NOT NULL,
    PRIMARY KEY (AGG_TIMESTAMP, applicationId, apiName)
);
CREATE INDEX idx_apiName_days ON ApiLatencyPercentiles_DAYS (apiName);
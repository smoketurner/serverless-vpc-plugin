const AWS = require('aws-sdk');

const { SECRET_ARN, RESOURCE_ARN, DATABASE_NAME, SCHEMA_NAME } = process.env;

AWS.config.logger = console;

/**
 * PostgreSQL Handler
 *
 * @param {Object} event
 * @param {Object} context
 * @return {Promise}
 */
// eslint-disable-next-line no-unused-vars
exports.handler = async (event, context) => {
  const rds = new AWS.RDSDataService();

  const params = {
    resourceArn: RESOURCE_ARN,
    secretArn: SECRET_ARN,
    sql: 'SELECT NOW()',
    database: DATABASE_NAME,
    schema: SCHEMA_NAME,
  };

  const response = await rds.executeStatement(params).promise();

  const { records = [] } = response;

  const [row] = records || [];

  return row[0].stringValue;
};

const fs = require('fs');

const AWS = require('aws-sdk');

const { SECRET_ARN, RESOURCE_ARN, DATABASE_NAME, SCHEMA_NAME } = process.env;

AWS.config.logger = console;

const FILENAME = '/mnt/efs0/counter';

/**
 * PostgreSQL Handler
 *
 * @param {Object} event
 * @param {Object} context
 * @return {Promise}
 */
// eslint-disable-next-line no-unused-vars
exports.handler = async (event, context) => {
  let value;
  if (fs.existsSync(FILENAME)) {
    const curValue = parseInt(fs.readFileSync(FILENAME), 10) || 0;
    value = curValue + 1;
  } else {
    value = 0;
  }

  fs.writeFileSync(FILENAME, value);

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

  const result = {
    'RDS NOW()': row[0].stringValue,
    'EFS Counter': value,
  };

  console.log('result:', result);

  return result;
};

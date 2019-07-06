const fs = require('fs');

const AWS = require('aws-sdk');
const pg = require('pg');

AWS.config.logger = console;

const { DB_NAME, SECRET_NAME } = process.env;

/**
 * Get a secret from Secrets Manager
 *
 * @param {String} SecretId
 * @return {Promise<Object>}
 */
async function getSecret(SecretId) {
  const secretsmanager = new AWS.SecretsManager();

  const params = {
    SecretId,
    VersionStage: 'AWSCURRENT',
  };

  let data;
  try {
    data = await secretsmanager.getSecretValue(params).promise();
    if (data.SecretString) {
      data = JSON.parse(data.SecretString);
    }
  } catch (err) {
    console.error(`Unable to get secret ${SecretId}:`, err);
    throw err;
  }
  return data;
}

let SECRET_DATA;

/**
 * Postgres Handler
 *
 * @param {Object} event
 * @param {Object} context
 * @return {Promise}
 */
// eslint-disable-next-line no-unused-vars
exports.handler = async (event, context) => {
  if (!SECRET_DATA) {
    SECRET_DATA = await getSecret(SECRET_NAME);
  }

  const config = {
    user: SECRET_DATA.username,
    password: SECRET_DATA.password,
    database: DB_NAME,
    host: SECRET_DATA.host,
    port: SECRET_DATA.port,
    // this object will be passed to the TLSSocket constructor
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync('/var/task/rds-combined-ca-bundle.pem').toString(),
      // key: fs.readFileSync('/var/task/rds-combined-ca-bundle.pem').toString(),
      cert: fs.readFileSync('/var/task/rds-combined-ca-bundle.pem').toString(),
    },
    statement_timeout: 5000, // milliseconds
  };
};

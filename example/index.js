const fs = require('fs');

const AWS = require('aws-sdk');
const pg = require('pg');

AWS.config.logger = console;

const { SECRET_NAME } = process.env;

async function getSecret(name = SECRET_NAME) {
  const secretsmanager = new AWS.SecretsManager();

  let config;
  try {
    config = await secretsmanager.getSecretValue(name);
  } catch (err) {
    console.error(`Unable to get secret ${name}:`, err);
    throw err;
  }
}

/**
 * Postgres Handler
 *
 * @param {Object} event
 * @param {Object} context
 * @return {Promise}
 */
// eslint-disable-next-line no-unused-vars
exports.handler = async (event, context) => {
  const config = {
    database: 'database-name',
    host: 'host-or-ip',
    // this object will be passed to the TLSSocket constructor
    ssl: {
      rejectUnauthorized: false,
      ca: fs.readFileSync('/var/task/rds-combined-ca-bundle.pem').toString(),
      key: fs.readFileSync('/var/task/rds-combined-ca-bundle.pem').toString(),
      cert: fs.readFileSync('/var/task/rds-combined-ca-bundle.pem').toString(),
    },
  };
};

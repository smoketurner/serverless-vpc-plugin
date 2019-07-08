const https = require('https');

const AWS = require('aws-sdk');
const { Client } = require('pg');

const { default: CERT_DATA } = require('./rds-combined-ca-bundle.pem');

const { SECRET_NAME } = process.env;

/**
 * Return a new HTTPS Agent with keep-alives enabled
 *
 * @return {Agent}
 * @see https://github.com/aws/aws-sdk-js/blob/v2.437.0/lib/http/node.js#L141
 * @see https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-configuring-maxsockets.html
 */
function getKeepAliveAgent() {
  const options = {
    keepAlive: true,
    rejectUnauthorized: true, // from aws-sdk
    maxSockets: 50, // from aws-sdk
  };
  const agent = new https.Agent(options);
  agent.setMaxListeners(0); // from aws-sdk
  return agent;
}

AWS.config.logger = console;

AWS.config.update({
  httpOptions: {
    agent: getKeepAliveAgent(),
  },
});

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
    database: 'postgres',
    host: SECRET_DATA.host,
    port: SECRET_DATA.port,
    // this object will be passed to the TLSSocket constructor
    ssl: {
      rejectUnauthorized: true,
      ca: CERT_DATA,
      cert: CERT_DATA,
    },
    statement_timeout: 5000, // milliseconds
  };

  const client = new Client(config);
  await client.connect();

  const res = await client.query('SELECT NOW()');

  const [now] = res.rows || [];

  await client.end();

  return now;
};

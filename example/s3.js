const http = require('http');

const AWS = require('aws-sdk');

AWS.config.logger = console;

const { BUCKET_NAME } = process.env;

/**
 * Return the public IP
 *
 * @return {Promise}
 */
function getPublicIp() {
  const options = {
    host: 'api.ipify.org',
    port: 80,
    path: '/',
  };
  return new Promise((resolve, reject) => {
    const req = http.get(options, res => {
      const buffers = [];
      res.on('data', data => buffers.push(data));
      res.once('end', () => resolve(Buffer.concat(buffers).toString()));
      res.once('error', reject);
    });
    req.once('error', reject);
  });
}

/**
 * S3 Uplaod Handler
 *
 * @param {Object} event
 * @param {Object} context
 * @return {Promise}
 */
// eslint-disable-next-line no-unused-vars
exports.handler = async (event, context) => {
  if (!BUCKET_NAME) {
    throw new Error('BUCKET_NAME is not defined');
  }

  const ip = await getPublicIp();

  const s3 = new AWS.S3();

  const params = {
    Bucket: BUCKET_NAME,
    Key: 'event.json',
    Body: JSON.stringify({ ip }),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256',
  };

  try {
    await s3.putObject(params).promise();
    console.debug(`Successfully uploaded ${params.Key} to ${params.Bucket}`);
  } catch (err) {
    console.error(`Unable to upload ${params.Key} to ${params.Bucket}:`, err);
    return false;
  }

  return true;
};

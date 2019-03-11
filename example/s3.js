const AWS = require('aws-sdk');

AWS.config.logger = console;

const { BUCKET_NAME } = process.env;

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

  const s3 = new AWS.S3();

  const params = {
    Bucket: BUCKET_NAME,
    Key: 'event.json',
    Body: JSON.stringify(event),
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

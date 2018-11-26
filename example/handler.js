const AWS = require('aws-sdk');

const { BUCKET_NAME } = process.env;

// eslint-disable-next-line no-unused-vars
module.exports.s3 = async (event, context) => {
  const s3 = new AWS.S3();

  const params = {
    Bucket: BUCKET_NAME,
    Key: 'event.json',
    Body: JSON.stringify(event),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256',
  };

  const response = await s3.putObject(params).promise();
  return response;
};

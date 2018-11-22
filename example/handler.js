const AWS = require('aws-sdk');

const { BUCKET_NAME } = process.env;

module.exports.s3 = async (event, context) => {
  const s3 = new AWS.S3();

  const params = {
    Bucket: BUCKET_NAME,
    Key: 'test.txt',
    Body: 'this is a test',
    ContentType: 'text/plain',
    ServerSideEncryption: 'AES256',
  };

  const response = await s3.putObject(params).promise();
  return response;
};

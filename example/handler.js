const AWS = require('aws-sdk');

const { BUCKET_NAME } = process.env;

module.exports.s3 = async (event, context) => {
  const s3 = new AWS.S3();

  const params = {
    Bucket: BUCKET_NAME,
    Key: 'test.txt',
    Body: 'this is a test',
    // ACL: 'bucket-owner-full-control',
    CacheControl: 'no-cache, no-store, must-revalidate',
    ContentType: 'text/plain',
    Expires: 0,
    ServerSideEncryption: 'AES256',
  };

  console.log('params:', params);

  const response = await s3.putObject(params).promise();

  console.log('response:', response);

  return 'OK';
};

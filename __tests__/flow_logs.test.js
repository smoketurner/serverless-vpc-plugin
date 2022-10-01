const { buildLogBucket, buildLogBucketPolicy, buildVpcFlowLogs } = require('../src/flow_logs');

describe('flow_logs', () => {
  describe('#buildVpcFlowLogs', () => {
    it('builds a VPC flow log', () => {
      const expected = {
        S3FlowLog: {
          Type: 'AWS::EC2::FlowLog',
          DependsOn: 'LogBucketPolicy',
          Properties: {
            LogDestinationType: 's3',
            LogDestination: {
              'Fn::GetAtt': ['LogBucket', 'Arn'],
            },
            ResourceId: {
              Ref: 'VPC',
            },
            ResourceType: 'VPC',
            TrafficType: 'ALL',
          },
        },
      };

      const actual = buildVpcFlowLogs();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildLogBucketPolicy', () => {
    it('builds a log bucket policy', () => {
      const expected = {
        LogBucketPolicy: {
          Type: 'AWS::S3::BucketPolicy',
          Properties: {
            Bucket: {
              Ref: 'LogBucket',
            },
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'AWSLogDeliveryAclCheck',
                  Effect: 'Allow',
                  Principal: {
                    Service: 'delivery.logs.amazonaws.com',
                  },
                  Action: 's3:GetBucketAcl',
                  Resource: {
                    'Fn::GetAtt': ['LogBucket', 'Arn'],
                  },
                },
                {
                  Sid: 'AWSLogDeliveryWrite',
                  Effect: 'Allow',
                  Principal: {
                    Service: 'delivery.logs.amazonaws.com',
                  },
                  Action: 's3:PutObject',
                  Resource: {
                    'Fn::Sub':
                      // eslint-disable-next-line no-template-curly-in-string
                      'arn:${AWS::Partition}:s3:::${LogBucket}/AWSLogs/${AWS::AccountId}/*',
                  },
                  Condition: {
                    StringEquals: {
                      's3:x-amz-acl': 'bucket-owner-full-control',
                    },
                  },
                },
                {
                  Effect: 'Deny',
                  Principal: '*',
                  Action: 's3:*',
                  Resource: [
                    {
                      // eslint-disable-next-line no-template-curly-in-string
                      'Fn::Sub': '${WebBucket.Arn}/*',
                    },
                    {
                      'Fn::GetAtt': 'WebBucket.Arn',
                    },
                  ],
                  Condition: {
                    Bool: {
                      'aws:SecureTransport': false,
                    },
                  },
                },
              ],
            },
          },
        },
      };
      const actual = buildLogBucketPolicy();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildLogBucket', () => {
    it('builds a log bucket', () => {
      const expected = {
        LogBucket: {
          Type: 'AWS::S3::Bucket',
          DeletionPolicy: 'Retain',
          UpdateReplacePolicy: 'Retain',
          Properties: {
            AccessControl: 'LogDeliveryWrite',
            BucketEncryption: {
              ServerSideEncryptionConfiguration: [
                {
                  ServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256',
                  },
                },
              ],
            },
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true,
            },
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName} Logs',
                },
              },
            ],
          },
        },
      };
      const actual = buildLogBucket();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

/**
 * Build an S3 bucket for logging
 *
 * @return {Object}
 */
function buildLogBucket() {
  return {
    LogBucket: {
      Type: 'AWS::S3::Bucket',
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Properties: {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        LifecycleConfiguration: {
          Rules: [
            {
              ExpirationInDays: 365,
              Id: 'RetentionRule',
              Prefix: 'AWSLogs',
              Status: 'Enabled',
              Transitions: [
                {
                  TransitionInDays: 30,
                  StorageClass: 'STANDARD_IA',
                },
                {
                  TransitionInDays: 90,
                  StorageClass: 'GLACIER',
                },
              ],
            },
          ],
        },
        OwnershipControls: {
          Rules: [
            {
              ObjectOwnership: 'BucketOwnerEnforced',
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
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      },
    },
  };
}

/**
 * Build an S3 Bucket Policy for the logging bucket
 *
 * @return {Object}
 * @see https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3.html#flow-logs-s3-permissions
 */
function buildLogBucketPolicy() {
  return {
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
              Action: ['s3:GetBucketAcl', 's3:ListBucket'],
              Resource: {
                'Fn::GetAtt': ['LogBucket', 'Arn'],
              },
              Condition: {
                StringEquals: {
                  'aws:SourceAccount': {
                    Ref: 'AWS::AccountId',
                  },
                },
                ArnLike: {
                  'aws:SourceArn': {
                    // eslint-disable-next-line no-template-curly-in-string
                    'Fn::Sub': 'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:*',
                  },
                },
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
                // eslint-disable-next-line no-template-curly-in-string
                'Fn::Sub': 'arn:${AWS::Partition}:s3:::${LogBucket}/*',
              },
              Condition: {
                StringEquals: {
                  'aws:SourceAccount': {
                    Ref: 'AWS::AccountId',
                  },
                  's3:x-amz-acl': 'bucket-owner-full-control',
                },
                ArnLike: {
                  'aws:SourceArn': {
                    // eslint-disable-next-line no-template-curly-in-string
                    'Fn::Sub': 'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:*',
                  },
                },
              },
            },
            {
              Sid: 'AllowSSLRequestsOnly',
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: [
                {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${LogBucket.Arn}/*',
                },
                {
                  'Fn::GetAtt': 'LogBucket.Arn',
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
}

/**
 * Build a VPC FlowLog definition that logs to an S3 bucket
 *
 * @param {Object} params
 * @return {Object}
 */
function buildVpcFlowLogs({ name = 'S3FlowLog' } = {}) {
  return {
    [name]: {
      Type: 'AWS::EC2::FlowLog',
      DependsOn: 'LogBucketPolicy',
      Properties: {
        DestinationOptions: {
          FileFormat: 'parquet',
          HiveCompatiblePartitions: true,
          PerHourPartition: true,
        },
        LogDestination: {
          'Fn::GetAtt': ['LogBucket', 'Arn'],
        },
        LogDestinationType: 's3',
        // eslint-disable-next-line no-template-curly-in-string
        LogFormat: '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${instance-id} ${tcp-flags} ${type} ${pkt-srcaddr} ${pkt-dstaddr} ${region} ${az-id} ${sublocation-type} ${sublocation-id} ${pkt-src-aws-service} ${pkt-dst-aws-service} ${flow-direction} ${traffic-path}',
        MaxAggregationInterval: 60, // seconds
        ResourceId: {
          Ref: 'VPC',
        },
        ResourceType: 'VPC',
        TrafficType: 'ALL',
      },
    },
  };
}

module.exports = {
  buildLogBucket,
  buildLogBucketPolicy,
  buildVpcFlowLogs,
};

const {
  buildEndpointServices,
  buildVPCEndpoint,
  buildLambdaVPCEndpointSecurityGroup,
} = require('../src/vpce');

describe('vpce', () => {
  describe('#buildEndpointServices', () => {
    it('skips building endpoints if none provided', () => {
      const actual = buildEndpointServices();
      expect(actual).toEqual({});
      expect.assertions(1);
    });

    it('builds an S3 VPC Gateway endpoint', () => {
      const expected = {
        S3VPCEndpoint: {
          Type: 'AWS::EC2::VPCEndpoint',
          Properties: {
            RouteTableIds: [
              {
                Ref: 'AppRouteTable1',
              },
            ],
            ServiceName: {
              'Fn::Join': [
                '.',
                [
                  'com.amazonaws',
                  {
                    Ref: 'AWS::Region',
                  },
                  's3',
                ],
              ],
            },
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 's3:*',
                  Resource: '*',
                },
              ],
            },
            VpcEndpointType: 'Gateway',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildEndpointServices({
        services: ['s3'],
        numZones: 1,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds an DynamoDB VPC Gateway endpoint', () => {
      const expected = {
        DynamodbVPCEndpoint: {
          Type: 'AWS::EC2::VPCEndpoint',
          Properties: {
            RouteTableIds: [
              {
                Ref: 'AppRouteTable1',
              },
            ],
            ServiceName: {
              'Fn::Join': [
                '.',
                [
                  'com.amazonaws',
                  {
                    Ref: 'AWS::Region',
                  },
                  'dynamodb',
                ],
              ],
            },
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 'dynamodb:*',
                  Resource: '*',
                },
              ],
            },
            VpcEndpointType: 'Gateway',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildEndpointServices({
        services: ['dynamodb'],
        numZones: 1,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds an KMS VPC Interface endpoint', () => {
      const expected = {
        KmsVPCEndpoint: {
          Type: 'AWS::EC2::VPCEndpoint',
          Properties: {
            PrivateDnsEnabled: true,
            SecurityGroupIds: [
              {
                Ref: 'LambdaEndpointSecurityGroup',
              },
            ],
            SubnetIds: [
              {
                Ref: 'AppSubnet1',
              },
            ],
            ServiceName: {
              'Fn::Join': [
                '.',
                [
                  'com.amazonaws',
                  {
                    Ref: 'AWS::Region',
                  },
                  'kms',
                ],
              ],
            },
            VpcEndpointType: 'Interface',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildEndpointServices({
        services: ['kms'],
        numZones: 1,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds an SageMaker Runtime FIPS VPC Interface endpoint', () => {
      const expected = {
        SagemakerRuntimeFipsVPCEndpoint: {
          Type: 'AWS::EC2::VPCEndpoint',
          Properties: {
            PrivateDnsEnabled: true,
            SecurityGroupIds: [
              {
                Ref: 'LambdaEndpointSecurityGroup',
              },
            ],
            SubnetIds: [
              {
                Ref: 'AppSubnet1',
              },
            ],
            ServiceName: {
              'Fn::Join': [
                '.',
                [
                  'com.amazonaws',
                  {
                    Ref: 'AWS::Region',
                  },
                  'sagemaker.runtime-fips',
                ],
              ],
            },
            VpcEndpointType: 'Interface',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildEndpointServices({
        services: ['sagemaker.runtime-fips'],
        numZones: 1,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildVPCEndpoint', () => {
    it('builds an S3 VPC Gateway endpoint', () => {
      const expected = {
        S3VPCEndpoint: {
          Type: 'AWS::EC2::VPCEndpoint',
          Properties: {
            RouteTableIds: [
              {
                Ref: 'AppRouteTable1',
              },
            ],
            ServiceName: {
              'Fn::Join': [
                '.',
                [
                  'com.amazonaws',
                  {
                    Ref: 'AWS::Region',
                  },
                  's3',
                ],
              ],
            },
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 's3:*',
                  Resource: '*',
                },
              ],
            },
            VpcEndpointType: 'Gateway',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildVPCEndpoint('s3', {
        routeTableIds: [{ Ref: 'AppRouteTable1' }],
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds an SageMaker Runtime FIPS VPC Interface endpoint', () => {
      const expected = {
        SagemakerRuntimeFipsVPCEndpoint: {
          Type: 'AWS::EC2::VPCEndpoint',
          Properties: {
            PrivateDnsEnabled: true,
            SecurityGroupIds: [
              {
                Ref: 'LambdaEndpointSecurityGroup',
              },
            ],
            SubnetIds: [
              {
                Ref: 'AppSubnet1',
              },
            ],
            ServiceName: {
              'Fn::Join': [
                '.',
                [
                  'com.amazonaws',
                  {
                    Ref: 'AWS::Region',
                  },
                  'sagemaker.runtime-fips',
                ],
              ],
            },
            VpcEndpointType: 'Interface',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildVPCEndpoint('sagemaker.runtime-fips', {
        subnetIds: [{ Ref: 'AppSubnet1' }],
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildLambdaVPCEndpointSecurityGroup', () => {
    it('builds a Lambda endpoint security group with no options', () => {
      const expected = {
        LambdaEndpointSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Lambda access to VPC endpoints',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupIngress: [
              {
                SourceSecurityGroupId: {
                  Ref: 'LambdaExecutionSecurityGroup',
                },
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
              },
            ],
            Tags: [
              {
                Key: 'Name',
                Value: {
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'lambda-endpoint',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };
      const actual = buildLambdaVPCEndpointSecurityGroup();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a Lambda security group with a custom name', () => {
      const expected = {
        MyLambdaEndpointSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Lambda access to VPC endpoints',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupIngress: [
              {
                SourceSecurityGroupId: {
                  Ref: 'LambdaExecutionSecurityGroup',
                },
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
              },
            ],
            Tags: [
              {
                Key: 'Name',
                Value: {
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'lambda-endpoint',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };
      const actual = buildLambdaVPCEndpointSecurityGroup({
        name: 'MyLambdaEndpointSecurityGroup',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

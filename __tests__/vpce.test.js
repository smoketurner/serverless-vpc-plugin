const { buildEndpointServices, buildVPCEndpoint } = require('../src/vpce');

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
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'com.amazonaws.${AWS::Region}.s3',
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
      const actual = buildEndpointServices(['s3'], 1);
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
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'com.amazonaws.${AWS::Region}.dynamodb',
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
      const actual = buildEndpointServices(['dynamodb'], 1);
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
                Ref: 'AppSecurityGroup',
              },
            ],
            SubnetIds: [
              {
                Ref: 'AppSubnet1',
              },
            ],
            ServiceName: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'com.amazonaws.${AWS::Region}.kms',
            },
            VpcEndpointType: 'Interface',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildEndpointServices(['kms'], 1);
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
                Ref: 'AppSecurityGroup',
              },
            ],
            SubnetIds: [
              {
                Ref: 'AppSubnet1',
              },
            ],
            ServiceName: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'com.amazonaws.${AWS::Region}.sagemaker.runtime-fips',
            },
            VpcEndpointType: 'Interface',
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildEndpointServices(['sagemaker.runtime-fips'], 1);
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
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'com.amazonaws.${AWS::Region}.s3',
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
                Ref: 'AppSecurityGroup',
              },
            ],
            SubnetIds: [
              {
                Ref: 'AppSubnet1',
              },
            ],
            ServiceName: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'com.amazonaws.${AWS::Region}.sagemaker.runtime-fips',
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
});

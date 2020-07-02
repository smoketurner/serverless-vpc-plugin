const { buildNatInstance, buildNatSecurityGroup } = require('../src/nat_instance');

describe('nat_instance', () => {
  describe('#buildNatSecurityGroup', () => {
    it('builds a security group', () => {
      const expected = {
        NatSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'NAT Instance',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupEgress: [
              {
                Description: 'permit outbound HTTP to the Internet',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
                CidrIp: '0.0.0.0/0',
              },
              {
                Description: 'permit outbound HTTPS to the Internet',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
                CidrIp: '0.0.0.0/0',
              },
            ],
            SecurityGroupIngress: [
              {
                Description: 'permit inbound HTTP from AppSecurityGroup',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
                SourceSecurityGroupId: {
                  Ref: 'AppSecurityGroup',
                },
              },
              {
                Description: 'permit inbound HTTPS from AppSecurityGroup',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
                SourceSecurityGroupId: {
                  Ref: 'AppSecurityGroup',
                },
              },
            ],
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-nat',
                },
              },
            ],
          },
        },
      };

      const actual = buildNatSecurityGroup();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildNatInstance', () => {
    it('builds an EC2 instance', () => {
      const expected = {
        NatInstance: {
          Type: 'AWS::EC2::Instance',
          DependsOn: 'InternetGatewayAttachment',
          Properties: {
            AvailabilityZone: {
              'Fn::Select': ['0', ['us-east-1a', 'us-east-1b']],
            },
            BlockDeviceMappings: [
              {
                DeviceName: '/dev/xvda',
                Ebs: {
                  VolumeSize: 10,
                  VolumeType: 'gp2',
                  DeleteOnTermination: true,
                },
              },
            ],
            ImageId: 'ami-00a9d4a05375b2763',
            InstanceType: 't2.micro',
            Monitoring: false,
            NetworkInterfaces: [
              {
                AssociatePublicIpAddress: true,
                DeleteOnTermination: true,
                Description: 'eth0',
                DeviceIndex: '0',
                GroupSet: [
                  {
                    Ref: 'NatSecurityGroup',
                  },
                ],
                SubnetId: {
                  Ref: 'PublicSubnet1',
                },
              },
            ],
            SourceDestCheck: false,
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-nat',
                },
              },
            ],
          },
        },
      };

      const imageId = 'ami-00a9d4a05375b2763';

      const actual = buildNatInstance(imageId, ['us-east-1a', 'us-east-1b']);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

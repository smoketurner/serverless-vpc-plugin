const {
  buildBastionIamInstanceProfile,
  buildBastionIamRole,
  buildBastionInstance,
  buildBastionSecurityGroup,
} = require('../src/bastion');

describe('bastion', () => {
  describe('#buildBastionIamInstanceProfile', () => {
    it('builds an instance profile', () => {
      const expected = {
        BastionInstanceProfile: {
          Type: 'AWS::IAM::InstanceProfile',
          Properties: {
            Roles: [
              {
                Ref: 'BastionIamRole',
              },
            ],
          },
        },
      };

      const actual = buildBastionIamInstanceProfile();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastionIamRole', () => {
    it('builds an IAM role', () => {
      const expected = {
        BastionIamRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Statement: [
                {
                  Principal: {
                    Service: 'ec2.amazonaws.com',
                  },
                  Effect: 'Allow',
                  Action: 'sts:AssumeRole',
                },
              ],
            },
          },
        },
      };

      const actual = buildBastionIamRole();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastionSecurityGroup', () => {
    it('builds a security group', () => {
      const expected = {
        BastionSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Bastion Host',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupEgress: [
              {
                Description: 'Allow outbound HTTP access to the Internet',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
                CidrIp: '0.0.0.0/0',
              },
              {
                Description: 'Allow outbound HTTPS access to the Internet',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
                CidrIp: '0.0.0.0/0',
              },
            ],
            SecurityGroupIngress: [
              {
                Description: 'Allow inbound SSH access to the NAT instance',
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                CidrIp: '0.0.0.0/0',
              },
              {
                Description: 'Allow inbound HTTP traffic from AppSubnet1',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
                CidrIp: '10.0.0.0/21',
              },
              {
                Description: 'Allow inbound HTTPS traffic from AppSubnet1',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
                CidrIp: '10.0.0.0/21',
              },
              {
                Description: 'Allow inbound HTTP traffic from AppSubnet2',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
                CidrIp: '10.0.6.0/21',
              },
              {
                Description: 'Allow inbound HTTPS traffic from AppSubnet2',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
                CidrIp: '10.0.6.0/21',
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
                      'bastion',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };

      const actual = buildBastionSecurityGroup({ subnets: ['10.0.0.0/21', '10.0.6.0/21'] });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastionInstance', () => {
    it('builds an EC2 instance', () => {
      const expected = {
        BastionInstance: {
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
                  VolumeSize: 30,
                  VolumeType: 'gp2',
                  DeleteOnTermination: true,
                  SnapshotId: 'snap-067424abc11f77a61',
                },
              },
            ],
            IamInstanceProfile: {
              Ref: 'BastionInstanceProfile',
            },
            ImageId: 'ami-00a9d4a05375b2763', // amzn-ami-vpc-nat-hvm-2018.03.0.20181116-x86_64-ebs
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
                    Ref: 'BastionSecurityGroup',
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
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'bastion',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };

      const actual = buildBastionInstance({ zones: ['us-east-1a', 'us-east-1b'] });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

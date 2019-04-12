const { buildBastionInstance, buildBastionSecurityGroup } = require('../src/bastion');

describe('bastion', () => {
  describe('#buildBastionSecurityGroup', () => {
    it('builds a security group with open access', () => {
      const expected = {
        BastionSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Bastion Host',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupIngress: [
              {
                Description: 'Allow inbound SSH access to the bastion host',
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                CidrIp: '0.0.0.0/0',
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

      const actual = buildBastionSecurityGroup();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a security group with restricted access', () => {
      const expected = {
        BastionSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Bastion Host',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupIngress: [
              {
                Description: 'Allow inbound SSH access to the bastion host',
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                CidrIp: '127.0.0.1/32',
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

      const actual = buildBastionSecurityGroup('127.0.0.1/32');
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
            KeyName: 'MyKey',
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
                    Ref: 'BastionSecurityGroup',
                  },
                ],
                SubnetId: {
                  Ref: 'PublicSubnet1',
                },
              },
            ],
            SourceDestCheck: true,
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

      const image = {
        ImageId: 'ami-00a9d4a05375b2763',
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/xvda',
            Ebs: {
              VolumeSize: 8,
              VolumeType: 'gp2',
              DeleteOnTermination: true,
              SnapshotId: 'snap-067424abc11f77a61',
            },
          },
        ],
      };

      const actual = buildBastionInstance(image, 'MyKey', ['us-east-1a', 'us-east-1b']);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

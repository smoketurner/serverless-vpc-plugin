const nock = require('nock');

const {
  getPublicIp,
  buildBastion,
  buildBastionEIP,
  buildBastionIamRole,
  buildBastionInstanceProfile,
  buildBastionLaunchConfiguration,
  buildBastionAutoScalingGroup,
  buildBastionSecurityGroup,
} = require('../src/bastion');

describe('bastion', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });
  afterEach(() => {
    nock.cleanAll();
  });

  describe('#getPublicIp', () => {
    it('gets the public IP', async () => {
      const scope = nock('https://checkip.amazonaws.com').get('/').reply(200, '127.0.0.1');

      const actual = await getPublicIp();
      expect(actual).toEqual('127.0.0.1');
      expect(scope.isDone()).toBeTruthy();
      expect.assertions(2);
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
                  Effect: 'Allow',
                  Principal: {
                    Service: 'ec2.amazonaws.com',
                  },
                  Action: 'sts:AssumeRole',
                },
              ],
            },
            Policies: [
              {
                PolicyName: 'AllowEIPAssociation',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Action: 'ec2:AssociateAddress',
                      Resource: '*',
                      Effect: 'Allow',
                    },
                  ],
                },
              },
            ],
            ManagedPolicyArns: [
              // eslint-disable-next-line no-template-curly-in-string
              { 'Fn::Sub': 'arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore' },
            ],
          },
        },
      };

      const actual = buildBastionIamRole();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

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
                Description: 'permit inbound SSH',
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                CidrIp: '0.0.0.0/0',
              },
              {
                Description: 'permit inbound ICMP',
                IpProtocol: 'icmp',
                FromPort: -1,
                ToPort: -1,
                CidrIp: '0.0.0.0/0',
              },
            ],
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-bastion',
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
                Description: 'permit inbound SSH',
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                CidrIp: '127.0.0.1/32',
              },
              {
                Description: 'permit inbound ICMP',
                IpProtocol: 'icmp',
                FromPort: -1,
                ToPort: -1,
                CidrIp: '127.0.0.1/32',
              },
            ],
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-bastion',
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

  describe('#buildBastionEIP', () => {
    it('builds EIP for the bastion host', () => {
      const expected = {
        BastionEIP: {
          Type: 'AWS::EC2::EIP',
          Properties: {
            Domain: 'vpc',
          },
        },
      };

      const actual = buildBastionEIP();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastionInstanceProfile', () => {
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

      const actual = buildBastionInstanceProfile();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastionLaunchConfiguration', () => {
    it('builds launch configuration', () => {
      const expected = {
        BastionLaunchConfiguration: {
          Type: 'AWS::AutoScaling::LaunchConfiguration',
          Properties: {
            AssociatePublicIpAddress: true,
            BlockDeviceMappings: [
              {
                DeviceName: '/dev/xvda',
                Ebs: {
                  VolumeSize: 10,
                  VolumeType: 'gp3',
                  DeleteOnTermination: true,
                },
              },
            ],
            KeyName: 'MyKey',
            ImageId: {
              Ref: 'LatestAmiId',
            },
            InstanceMonitoring: false,
            IamInstanceProfile: {
              Ref: 'BastionInstanceProfile',
            },
            InstanceType: 't2.micro',
            SecurityGroups: [
              {
                Ref: 'BastionSecurityGroup',
              },
            ],
            SpotPrice: '0.0116',
            UserData: {
              'Fn::Base64': {
                'Fn::Join': [
                  '',
                  [
                    '#!/bin/bash -xe\n',
                    '/usr/bin/yum update -y\n',
                    '/usr/bin/yum install -y aws-cfn-bootstrap\n',
                    'EIP_ALLOCATION_ID=',
                    { 'Fn::GetAtt': ['BastionEIP', 'AllocationId'] },
                    '\n',
                    'INSTANCE_ID=`/usr/bin/curl -sq http://169.254.169.254/latest/meta-data/instance-id`\n',
                    // eslint-disable-next-line no-template-curly-in-string
                    '/usr/bin/aws ec2 associate-address --instance-id ${INSTANCE_ID} --allocation-id ${EIP_ALLOCATION_ID} --region ',
                    { Ref: 'AWS::Region' },
                    '\n',
                    '/opt/aws/bin/cfn-signal --exit-code 0 --stack ',
                    { Ref: 'AWS::StackName' },
                    ' --resource BastionAutoScalingGroup ',
                    ' --region ',
                    { Ref: 'AWS::Region' },
                    '\n',
                  ],
                ],
              },
            },
          },
        },
      };

      const actual = buildBastionLaunchConfiguration('MyKey');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastionAutoScalingGroup', () => {
    it('builds nothing if no zones', () => {
      const actual = buildBastionAutoScalingGroup();
      expect(actual).toEqual({});
      expect.assertions(1);
    });

    it('builds an auto scaling group', () => {
      const expected = {
        BastionAutoScalingGroup: {
          Type: 'AWS::AutoScaling::AutoScalingGroup',
          CreationPolicy: {
            ResourceSignal: {
              Count: 1,
              Timeout: 'PT10M',
            },
          },
          Properties: {
            LaunchConfigurationName: {
              Ref: 'BastionLaunchConfiguration',
            },
            VPCZoneIdentifier: [
              {
                Ref: 'PublicSubnet1',
              },
              {
                Ref: 'PublicSubnet2',
              },
            ],
            MinSize: 1,
            MaxSize: 1,
            Cooldown: '300',
            DesiredCapacity: 1,
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-bastion',
                },
                PropagateAtLaunch: true,
              },
            ],
          },
        },
      };

      const actual = buildBastionAutoScalingGroup(2);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildBastion', () => {
    it('builds the complete bastion host', async () => {
      const scope = nock('https://checkip.amazonaws.com').get('/').reply(200, '127.0.0.1');

      const expected = {
        BastionEIP: {
          Type: 'AWS::EC2::EIP',
          Properties: {
            Domain: 'vpc',
          },
        },
        BastionIamRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    Service: 'ec2.amazonaws.com',
                  },
                  Action: 'sts:AssumeRole',
                },
              ],
            },
            Policies: [
              {
                PolicyName: 'AllowEIPAssociation',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Action: 'ec2:AssociateAddress',
                      Resource: '*',
                      Effect: 'Allow',
                    },
                  ],
                },
              },
            ],
            ManagedPolicyArns: [
              // eslint-disable-next-line no-template-curly-in-string
              { 'Fn::Sub': 'arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore' },
            ],
          },
        },
        BastionAutoScalingGroup: {
          Type: 'AWS::AutoScaling::AutoScalingGroup',
          CreationPolicy: {
            ResourceSignal: {
              Count: 1,
              Timeout: 'PT10M',
            },
          },
          Properties: {
            LaunchConfigurationName: {
              Ref: 'BastionLaunchConfiguration',
            },
            VPCZoneIdentifier: [
              {
                Ref: 'PublicSubnet1',
              },
              {
                Ref: 'PublicSubnet2',
              },
            ],
            MinSize: 1,
            MaxSize: 1,
            Cooldown: '300',
            DesiredCapacity: 1,
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-bastion',
                },
                PropagateAtLaunch: true,
              },
            ],
          },
        },
        BastionLaunchConfiguration: {
          Type: 'AWS::AutoScaling::LaunchConfiguration',
          Properties: {
            AssociatePublicIpAddress: true,
            BlockDeviceMappings: [
              {
                DeviceName: '/dev/xvda',
                Ebs: {
                  VolumeSize: 10,
                  VolumeType: 'gp3',
                  DeleteOnTermination: true,
                },
              },
            ],
            KeyName: 'MyKey',
            ImageId: {
              Ref: 'LatestAmiId',
            },
            InstanceMonitoring: false,
            IamInstanceProfile: {
              Ref: 'BastionInstanceProfile',
            },
            InstanceType: 't2.micro',
            SecurityGroups: [
              {
                Ref: 'BastionSecurityGroup',
              },
            ],
            SpotPrice: '0.0116',
            UserData: {
              'Fn::Base64': {
                'Fn::Join': [
                  '',
                  [
                    '#!/bin/bash -xe\n',
                    '/usr/bin/yum update -y\n',
                    '/usr/bin/yum install -y aws-cfn-bootstrap\n',
                    'EIP_ALLOCATION_ID=',
                    { 'Fn::GetAtt': ['BastionEIP', 'AllocationId'] },
                    '\n',
                    'INSTANCE_ID=`/usr/bin/curl -sq http://169.254.169.254/latest/meta-data/instance-id`\n',
                    // eslint-disable-next-line no-template-curly-in-string
                    '/usr/bin/aws ec2 associate-address --instance-id ${INSTANCE_ID} --allocation-id ${EIP_ALLOCATION_ID} --region ',
                    { Ref: 'AWS::Region' },
                    '\n',
                    '/opt/aws/bin/cfn-signal --exit-code 0 --stack ',
                    { Ref: 'AWS::StackName' },
                    ' --resource BastionAutoScalingGroup ',
                    ' --region ',
                    { Ref: 'AWS::Region' },
                    '\n',
                  ],
                ],
              },
            },
          },
        },
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
        BastionSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Bastion Host',
            VpcId: {
              Ref: 'VPC',
            },
            SecurityGroupIngress: [
              {
                Description: 'permit inbound SSH',
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                CidrIp: '127.0.0.1/32',
              },
              {
                Description: 'permit inbound ICMP',
                IpProtocol: 'icmp',
                FromPort: -1,
                ToPort: -1,
                CidrIp: '127.0.0.1/32',
              },
            ],
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-bastion',
                },
              },
            ],
          },
        },
      };

      const actual = await buildBastion('MyKey', 2);
      expect(actual).toEqual(expected);
      expect(scope.isDone()).toBeTruthy();
      expect.assertions(2);
    });
  });
});

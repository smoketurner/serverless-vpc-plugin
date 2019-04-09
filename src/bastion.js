const { APP_SUBNET } = require('./constants');

/**
 * Build an IAM Role for the bastion hosts
 *
 * @param {Object} params
 * @return {Object}
 */
function buildBastionIamRole({ name = 'BastionIamRole' } = {}) {
  return {
    [name]: {
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
}

/**
 * Build an IAM InstanceProfile for the bastion hosts
 *
 * @param {Object} params
 * @return {Object}
 */
function buildBastionIamInstanceProfile({ name = 'BastionInstanceProfile' } = {}) {
  return {
    [name]: {
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
}

/**
 * Build a SecurityGroup to be used by the bastion host
 *
 * @param {Object} params
 * @return {Object}
 */
function buildBastionSecurityGroup({ name = 'BastionSecurityGroup', subnets = [] } = {}) {
  const SecurityGroupIngress = [
    {
      Description: 'Allow inbound SSH access to the NAT instance',
      IpProtocol: 'tcp',
      FromPort: 22,
      ToPort: 22,
      CidrIp: '0.0.0.0/0',
    },
  ];

  if (Array.isArray(subnets) && subnets.length > 0) {
    subnets.forEach((subnet, index) => {
      const position = index + 1;

      const http = {
        Description: `Allow inbound HTTP traffic from ${APP_SUBNET}Subnet${position}`,
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: subnet,
      };
      const https = {
        Description: `Allow inbound HTTPS traffic from ${APP_SUBNET}Subnet${position}`,
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: subnet,
      };
      SecurityGroupIngress.push(http, https);
    });
  }

  return {
    [name]: {
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
        SecurityGroupIngress,
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
}

/**
 * Build the Bastion EC2 instance
 *
 * @param {Object} image AMI image object
 * @param {Object} params
 * @return {Object}
 */
function buildBastionInstance(image, { name = 'BastionInstance', zones = [] } = {}) {
  if (!Array.isArray(zones) || zones.length < 1) {
    return {};
  }
  if (!image) {
    return {};
  }

  return {
    [name]: {
      Type: 'AWS::EC2::Instance',
      DependsOn: 'InternetGatewayAttachment',
      Properties: {
        AvailabilityZone: {
          'Fn::Select': ['0', zones],
        },
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/xvda',
            Ebs: {
              VolumeSize: 30,
              VolumeType: 'gp2',
              DeleteOnTermination: true,
              SnapshotId: image.BlockDeviceMappings[0].Ebs.SnapshotId,
            },
          },
        ],
        IamInstanceProfile: {
          Ref: 'BastionInstanceProfile',
        },
        ImageId: image.ImageId, // amzn-ami-vpc-nat-hvm-2018.03.0.20181116-x86_64-ebs
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
}

module.exports = {
  buildBastionIamInstanceProfile,
  buildBastionIamRole,
  buildBastionInstance,
  buildBastionSecurityGroup,
};

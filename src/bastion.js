const { APP_SUBNET } = require('./constants');

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
 * Build the Bastion launch configuration
 *
 * @param {Object} params
 * @return {Object}
 */
function buildBastionLaunchConfiguration({ name = 'BastionLaunchConfiguration' } = {}) {
  return {
    [name]: {
      Type: 'AWS::AutoScaling::LaunchConfiguration',
      Properties: {
        AssociatePublicIpAddress: true,
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
        ImageId: 'ami-00a9d4a05375b2763', // amzn-ami-vpc-nat-hvm-2018.03.0.20181116-x86_64-ebs
        InstanceMonitoring: false,
        InstanceType: 't2.micro',
        SecurityGroups: [
          {
            Ref: 'BastionSecurityGroup',
          },
        ],
        SpotPrice: '0.0116', // https://aws.amazon.com/ec2/pricing/on-demand/
      },
    },
  };
}

/**
 * Build the Bastion host auto scaling group
 *
 * @param {Object} params
 * @return {Object}
 */
function buildBastionAutoScalingGroup({
  name = 'BastionAutoScalingGroup',
  subnets = [],
  zones = [],
} = {}) {
  return {
    [name]: {
      Type: 'AWS::AutoScaling::AutoScalingGroup',
      DependsOn: 'InternetGatewayAttachment',
      Properties: {
        AvailabilityZones: zones,
        DesiredCapacity: '1',
        HealthCheckType: 'EC2',
        LaunchConfigurationName: {
          Ref: 'BastionLaunchConfiguration',
        },
        MaxSize: '1',
        MinSize: '1',
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
                  'asg',
                ],
              ],
            },
          },
        ],
        VPCZoneIdentifier: subnets,
      },
    },
  };
}

exports.module = {
  buildBastionAutoScalingGroup,
  buildBastionLaunchConfiguration,
  buildBastionSecurityGroup,
};

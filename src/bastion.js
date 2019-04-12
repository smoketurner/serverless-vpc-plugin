const http = require('http');

const { PUBLIC_SUBNET } = require('./constants');

/**
 * Make an HTTP GET request and return the response
 *
 * @param {String} url
 * @return {Promise}
 */
async function fetch(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, response => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`Failed to load page, status code: ${response.statusCode}`));
      }
      let body = '';
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => resolve(body));
    });
    request.on('error', err => reject(err));
  });
}

/**
 * Return the current user's external IP address
 *
 * @return {String}
 */
async function getExternalIp() {
  return fetch('https://api.ipify.org');
}

/**
 * Build an EIP for the bastion host
 *
 * @return {Object}
 */
function buildBastionEIP({ name = 'BastionEIP' } = {}) {
  return {
    [name]: {
      Type: 'AWS::EC2::EIP',
      Properties: {
        Domain: 'vpc',
      },
    },
  };
}

/**
 * Build an IAM role for the bastion host
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
              Effect: 'Allow',
              Principal: {
                Service: 'ec2.amazonaws.com',
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Policies: [
          {
            PolicyName: 'Allow EIP Association',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Action: [
                    'ec2:AssociateAddress',
                    'ec2:DescribeAddresses',
                    'ec2:DisassociateAddress',
                  ],
                  Resource: '*',
                  Effect: 'Allow',
                },
              ],
            },
          },
        ],
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM'],
      },
    },
  };
}

/**
 * Build an instance profile for the bastion host
 *
 * @param {Object} params
 * @return {Object}
 */
function buildBastionInstanceProfile({ name = 'BastionInstanceProfile' } = {}) {
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
 * Build the auto-scaling group launch configuration for the bastion host
 *
 * @param {String} keyPairName Existing key pair name
 * @param {Object} params
 * @return {Object}
 */
function buildBastionLaunchConfiguration(
  keyPairName,
  { name = 'BastionLaunchConfiguration' } = {},
) {
  return {
    [name]: {
      Type: 'AWS::AutoScaling::LaunchConfiguration',
      Properties: {
        AssociatePublicIpAddress: true,
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
        KeyName: keyPairName,
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
        SpotPrice: '0.0116', // On-Demand price of t2.micro in us-east-1
        UserData: {
          'Fn::Base64': {
            'Fn::Join': [
              '',
              [
                '#!/bin/bash\n',
                'set -x\n',
                'export PATH=$PATH:/usr/local/bin\n',
                'which pip &> /dev/null\n',
                'if [ $? -ne 0 ] ; then\n',
                '    echo "PIP NOT INSTALLED"\n',
                '    [ `which yum` ] && $(yum install -y epel-release; yum install -y python-pip) && echo "PIP INSTALLED"\n',
                '    [ `which apt-get` ] && apt-get -y update && apt-get -y install python-pip && echo "PIP INSTALLED"\n',
                '    [ `which zypper` ] && zypper refresh && zypper install -y python-pip && update-alternatives --set easy_install /usr/bin/easy_install-2.7 && echo "PIP INSTALLED"\n',
                'fi\n',
                'pip install --upgrade pip &> /dev/null\n',
                'pip install awscli --ignore-installed six &> /dev/null\n',
                'easy_install https://s3.amazonaws.com/cloudformation-examples/aws-cfn-bootstrap-latest.tar.gz\n',
                'EIP_LIST="',
                {
                  Ref: 'BastionEIP',
                },
                '"\n',
                'CLOUDWATCHGROUP=',
                {
                  Ref: 'BastionMainLogGroup',
                },
                '\n',
                'cfn-init -v --stack ',
                {
                  Ref: 'AWS::StackName',
                },
                ' --resource BastionLaunchConfiguration --region ',
                {
                  Ref: 'AWS::Region',
                },
                '\n',
                'cfn-signal -e $? --stack ',
                {
                  Ref: 'AWS::StackName',
                },
                ' --resource BastionAutoScalingGroup --region ',
                {
                  Ref: 'AWS::Region',
                },
                '\n',
              ],
            ],
          },
        },
      },
    },
  };
}

/**
 * Build the bastion host auto-scaling group
 *
 * @param {Number} numZones Number of availability zones
 * @param {Object} params
 * @return {Object}
 */
function buildBastionAutoScalingGroup(numZones = 0, { name = 'BastionAutoScalingGroup' } = {}) {
  if (numZones < 1) {
    return {};
  }

  const zones = [];
  for (let i = 1; i <= numZones; i += 1) {
    zones.push({ Ref: `${PUBLIC_SUBNET}Subnet${i}` });
  }

  return {
    [name]: {
      Type: 'AWS::AutoScaling::AutoScalingGroup',
      CreationPolicy: {
        ResourceSignal: {
          Count: 1,
          Timeout: 'PT30M',
        },
      },
      Properties: {
        LaunchConfigurationName: {
          Ref: 'BastionLaunchConfiguration',
        },
        VPCZoneIdentifier: zones,
        MinSize: 1,
        MaxSize: 1,
        Cooldown: '300',
        DesiredCapacity: 1,
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
            PropagateAtLaunch: true,
          },
        ],
      },
    },
  };
}

/**
 * Build a SecurityGroup to be used by the bastion host
 *
 * @param {String} sourceIp source IP address
 * @param {Object} params
 * @return {Object}
 */
function buildBastionSecurityGroup(sourceIp = '0.0.0.0/0', { name = 'BastionSecurityGroup' } = {}) {
  return {
    [name]: {
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
            CidrIp: sourceIp,
          },
          {
            Description: 'Allow inbound ICMP to the bastion host',
            IpProtocol: 'icmp',
            FromPort: -1,
            ToPort: -1,
            CidrIp: sourceIp,
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
}

/**
 * Build the Bastion EC2 instance
 *
 * @param {String} keyPairName Existing KeyPair name
 * @param {Array} zones Array of availability zones
 * @param {Object} params
 * @return {Object}
 */
function buildBastionInstance(keyPairName, zones = [], { name = 'BastionInstance' } = {}) {
  if (!keyPairName) {
    return {};
  }
  if (!Array.isArray(zones) || zones.length < 1) {
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
            },
          },
        ],
        KeyName: keyPairName,
        ImageId: {
          Ref: 'LatestAmiId',
        },
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
}

/**
 * Build the bastion host
 *
 * @return {Object}
 */
async function buildBastion(keyPairName, numZones = 0) {
  if (numZones < 1) {
    return {};
  }
  const externalIp = await getExternalIp();

  return Object.assign(
    {},
    buildBastionEIP(),
    buildBastionIamRole(),
    buildBastionInstanceProfile(),
    buildBastionSecurityGroup(externalIp),
    buildBastionLaunchConfiguration(keyPairName),
    buildBastionAutoScalingGroup(numZones),
    // buildBastionInstance(bastionHostKeyName, zones),
  );
}

module.exports = {
  getExternalIp,
  buildBastion,
  buildBastionAutoScalingGroup,
  buildBastionEIP,
  buildBastionIamRole,
  buildBastionInstanceProfile,
  buildBastionInstance,
  buildBastionLaunchConfiguration,
  buildBastionSecurityGroup,
};

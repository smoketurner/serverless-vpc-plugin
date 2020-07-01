/**
 * Build a VPC
 *
 * @param {String} CidrBlock
 * @param {Object} params
 * @return {Object}
 */
function buildVpc(CidrBlock = '10.0.0.0/16') {
  return {
    VPC: {
      Type: 'AWS::EC2::VPC',
      Properties: {
        CidrBlock,
        EnableDnsSupport: true,
        EnableDnsHostnames: true,
        InstanceTenancy: 'default',
        Tags: [
          {
            Key: 'Name',
            Value: {
              Ref: 'AWS::StackName',
            },
          },
        ],
      },
    },
  };
}

/**
 * Build an InternetGateway and InternetGatewayAttachment
 *
 * @return {Object}
 */
function buildInternetGateway() {
  return {
    InternetGateway: {
      Type: 'AWS::EC2::InternetGateway',
      Properties: {
        Tags: [
          {
            Key: 'Name',
            Value: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-igw',
            },
          },
          {
            Key: 'Network',
            Value: 'Public',
          },
        ],
      },
    },
    InternetGatewayAttachment: {
      Type: 'AWS::EC2::VPCGatewayAttachment',
      Properties: {
        InternetGatewayId: {
          Ref: 'InternetGateway',
        },
        VpcId: {
          Ref: 'VPC',
        },
      },
    },
  };
}

/**
 * Build a SecurityGroup to be used by applications
 *
 * @return {Object}
 */
function buildAppSecurityGroup() {
  return {
    DefaultSecurityGroupEgress: {
      Type: 'AWS::EC2::SecurityGroupEgress',
      Properties: {
        IpProtocol: '-1',
        DestinationSecurityGroupId: {
          'Fn::GetAtt': ['VPC', 'DefaultSecurityGroup'],
        },
        GroupId: {
          'Fn::GetAtt': ['VPC', 'DefaultSecurityGroup'],
        },
      },
    },
    AppSecurityGroup: {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: {
        GroupDescription: 'Application Security Group',
        SecurityGroupEgress: [
          {
            Description: 'permit HTTPS outbound',
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0',
          },
        ],
        SecurityGroupIngress: [
          {
            Description: 'permit HTTPS inbound',
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0',
          },
        ],
        VpcId: {
          Ref: 'VPC',
        },
        Tags: [
          {
            Key: 'Name',
            Value: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-sg',
            },
          },
        ],
      },
    },
  };
}

/**
 * Build a DHCP Option Set
 *
 * @param {String} region
 * @return {Object}
 */
function buildDHCPOptions(region) {
  let domainName;
  if (region === 'us-east-1') {
    domainName = 'ec2.internal';
  } else {
    domainName = {
      // eslint-disable-next-line no-template-curly-in-string
      'Fn::Sub': '${AWS::Region}.compute.internal',
    };
  }

  return {
    DHCPOptions: {
      Type: 'AWS::EC2::DHCPOptions',
      Properties: {
        DomainName: domainName,
        DomainNameServers: ['AmazonProvidedDNS'],
        Tags: [
          {
            Key: 'Name',
            Value: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-DHCPOptionsSet',
            },
          },
        ],
      },
    },
    VPCDHCPOptionsAssociation: {
      Type: 'AWS::EC2::VPCDHCPOptionsAssociation',
      Properties: {
        VpcId: {
          Ref: 'VPC',
        },
        DhcpOptionsId: {
          Ref: 'DHCPOptions',
        },
      },
    },
  };
}

module.exports = {
  buildVpc,
  buildInternetGateway,
  buildAppSecurityGroup,
  buildDHCPOptions,
};

const {
  buildVpc,
  buildInternetGateway,
  buildAppSecurityGroup,
  buildDHCPOptions,
} = require('../src/vpc');

describe('vpc', () => {
  describe('#buildVpc', () => {
    it('builds a VPC', () => {
      const expected = {
        VPC: {
          Type: 'AWS::EC2::VPC',
          Properties: {
            CidrBlock: '10.0.0.0/16',
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

      const actual = buildVpc();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a VPC with a custom parameters', () => {
      const expected = {
        VPC: {
          Type: 'AWS::EC2::VPC',
          Properties: {
            CidrBlock: '192.168.0.0/16',
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

      const actual = buildVpc('192.168.0.0/16');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildInternetGateway', () => {
    it('builds an Internet Gateway with default name', () => {
      const expected = {
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

      const actual = buildInternetGateway();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildAppSecurityGroup', () => {
    it('builds a security group with no options', () => {
      const expected = {
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
              {
                DestinationPrefixListId: 'pl-63a5400a',
                Description: 'permit HTTPS to S3',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
              },
              {
                DestinationPrefixListId: 'pl-63a5400a',
                Description: 'permit HTTP to S3',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
              },
              {
                DestinationPrefixListId: 'pl-02cd2c6b',
                Description: 'permit HTTPS to DynamoDB',
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
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

      const prefixLists = {
        s3: 'pl-63a5400a',
        dynamodb: 'pl-02cd2c6b',
      };
      const actual = buildAppSecurityGroup(prefixLists);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildDHCPOptions', () => {
    it('builds a DHCP option set in us-east-1', () => {
      const expected = {
        DHCPOptions: {
          Type: 'AWS::EC2::DHCPOptions',
          Properties: {
            DomainName: 'ec2.internal',
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
      const actual = buildDHCPOptions('us-east-1');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a DHCP option set in us-west-2', () => {
      const expected = {
        DHCPOptions: {
          Type: 'AWS::EC2::DHCPOptions',
          Properties: {
            DomainName: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::Region}.compute.internal',
            },
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
      const actual = buildDHCPOptions('us-west-2');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

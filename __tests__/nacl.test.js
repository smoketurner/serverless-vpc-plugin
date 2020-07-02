const {
  buildNetworkAcl,
  buildNetworkAclEntry,
  buildNetworkAclAssociation,
  buildPublicNetworkAcl,
  buildAppNetworkAcl,
  buildDBNetworkAcl,
} = require('../src/nacl');

describe('nacl', () => {
  describe('#buildNetworkAcl', () => {
    it('builds a Network ACL', () => {
      const expected = {
        AppNetworkAcl: {
          Type: 'AWS::EC2::NetworkAcl',
          Properties: {
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-app',
                },
              },
            ],
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildNetworkAcl('App');
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildNetworkAclEntry', () => {
    it('builds an ingress Network ACL entry', () => {
      const expected = {
        PublicNetworkAclIngress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '0.0.0.0/0',
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
            Egress: false,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
      };
      const actual = buildNetworkAclEntry('PublicNetworkAcl', '0.0.0.0/0');
      expect(actual).toEqual(expected);
    });

    it('builds an egress Network ACL entry', () => {
      const expected = {
        PublicNetworkAclEgress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '0.0.0.0/0',
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
            Egress: true,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
      };
      const actual = buildNetworkAclEntry('PublicNetworkAcl', '0.0.0.0/0', {
        Egress: true,
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildNetworkAclAssociation', () => {
    it('builds a network ACL association', () => {
      const expected = {
        AppSubnetNetworkAclAssociation1: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'AppSubnet1',
            },
            NetworkAclId: {
              Ref: 'AppNetworkAcl',
            },
          },
        },
      };
      const actual = buildNetworkAclAssociation('App', 1);
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildPublicNetworkAcl', () => {
    it('builds the public network ACL', () => {
      const expected = {
        PublicNetworkAcl: {
          Type: 'AWS::EC2::NetworkAcl',
          Properties: {
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-public',
                },
              },
            ],
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
        PublicNetworkAclEgress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '0.0.0.0/0',
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
            Egress: true,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
        PublicNetworkAclIngress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '0.0.0.0/0',
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
            Egress: false,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
        PublicSubnetNetworkAclAssociation1: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'PublicSubnet1',
            },
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
          },
        },
        PublicSubnetNetworkAclAssociation2: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'PublicSubnet2',
            },
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
          },
        },
        PublicSubnetNetworkAclAssociation3: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'PublicSubnet3',
            },
            NetworkAclId: {
              Ref: 'PublicNetworkAcl',
            },
          },
        },
      };
      const actual = buildPublicNetworkAcl(3);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildAppNetworkAcl', () => {
    it('builds the application network ACL', () => {
      const expected = {
        AppNetworkAcl: {
          Type: 'AWS::EC2::NetworkAcl',
          Properties: {
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-app',
                },
              },
            ],
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
        AppNetworkAclEgress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '0.0.0.0/0',
            NetworkAclId: {
              Ref: 'AppNetworkAcl',
            },
            Egress: true,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
        AppNetworkAclIngress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '0.0.0.0/0',
            NetworkAclId: {
              Ref: 'AppNetworkAcl',
            },
            Egress: false,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
        AppSubnetNetworkAclAssociation1: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'AppSubnet1',
            },
            NetworkAclId: {
              Ref: 'AppNetworkAcl',
            },
          },
        },
        AppSubnetNetworkAclAssociation2: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'AppSubnet2',
            },
            NetworkAclId: {
              Ref: 'AppNetworkAcl',
            },
          },
        },
        AppSubnetNetworkAclAssociation3: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'AppSubnet3',
            },
            NetworkAclId: {
              Ref: 'AppNetworkAcl',
            },
          },
        },
      };
      const actual = buildAppNetworkAcl(3);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildDBNetworkAcl', () => {
    it('builds the database network ACL', () => {
      const expected = {
        DBNetworkAcl: {
          Type: 'AWS::EC2::NetworkAcl',
          Properties: {
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-db',
                },
              },
            ],
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
        DBNetworkAclEgress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '10.0.0.0/21',
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
            Egress: true,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
        DBNetworkAclIngress100: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '10.0.0.0/21',
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
            Egress: false,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 100,
          },
        },
        DBNetworkAclEgress101: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '10.0.16.0/21',
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
            Egress: true,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 101,
          },
        },
        DBNetworkAclIngress101: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '10.0.16.0/21',
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
            Egress: false,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 101,
          },
        },
        DBNetworkAclEgress102: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '10.0.32.0/21',
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
            Egress: true,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 102,
          },
        },
        DBNetworkAclIngress102: {
          Type: 'AWS::EC2::NetworkAclEntry',
          Properties: {
            CidrBlock: '10.0.32.0/21',
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
            Egress: false,
            Protocol: -1,
            RuleAction: 'allow',
            RuleNumber: 102,
          },
        },
        DBSubnetNetworkAclAssociation1: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'DBSubnet1',
            },
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
          },
        },
        DBSubnetNetworkAclAssociation2: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'DBSubnet2',
            },
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
          },
        },
        DBSubnetNetworkAclAssociation3: {
          Type: 'AWS::EC2::SubnetNetworkAclAssociation',
          Properties: {
            SubnetId: {
              Ref: 'DBSubnet3',
            },
            NetworkAclId: {
              Ref: 'DBNetworkAcl',
            },
          },
        },
      };
      const appSubnets = ['10.0.0.0/21', '10.0.16.0/21', '10.0.32.0/21'];
      const actual = buildDBNetworkAcl(appSubnets);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

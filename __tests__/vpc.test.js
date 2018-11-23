const {
  buildVpc,
  buildInternetGateway,
  buildInternetGatewayAttachment,
  buildLambdaSecurityGroup,
  buildSubnet,
  buildRoute,
  buildRouteTable,
  buildRouteTableAssociation,
} = require('../src/vpc');

describe('vpc', () => {
  describe('#buildVpc', () => {
    it('builds a VPC with default name', () => {
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
                Key: 'STAGE',
                Value: 'dev',
              },
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

      const actual = buildVpc('dev');
      expect(actual).toEqual(expected);
    });

    it('builds a VPC with a custom parameters', () => {
      const expected = {
        MyVpc: {
          Type: 'AWS::EC2::VPC',
          Properties: {
            CidrBlock: '192.168.0.0/16',
            EnableDnsSupport: true,
            EnableDnsHostnames: true,
            InstanceTenancy: 'default',
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
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

      const actual = buildVpc('dev', { name: 'MyVpc', cidrBlock: '192.168.0.0/16' });
      expect(actual).toEqual(expected);
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
                Key: 'STAGE',
                Value: 'dev',
              },
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

      const actual = buildInternetGateway('dev');
      expect(actual).toEqual(expected);
    });

    it('builds an Internet Gateway with a custom name', () => {
      const expected = {
        MyInternetGateway: {
          Type: 'AWS::EC2::InternetGateway',
          Properties: {
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
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

      const actual = buildInternetGateway('dev', { name: 'MyInternetGateway' });
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildInternetGatewayAttachment', () => {
    it('builds an Internet Gateway Attachment with default name', () => {
      const expected = {
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

      const actual = buildInternetGatewayAttachment();
      expect(actual).toEqual(expected);
    });

    it('builds an Internet Gateway Attachment with a custom name', () => {
      const expected = {
        MyInternetGatewayAttachment: {
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

      const actual = buildInternetGatewayAttachment({
        name: 'MyInternetGatewayAttachment',
      });

      expect(actual).toEqual(expected);
    });
  });

  describe('#buildSubnet', () => {
    it('builds a subnet', () => {
      const expected = {
        AppSubnet1: {
          Type: 'AWS::EC2::Subnet',
          Properties: {
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.0.0/22',
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
              {
                Key: 'Name',
                Value: {
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'app',
                      'us-east-1a',
                    ],
                  ],
                },
              },
            ],
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildSubnet('dev', 'App', 1, 'us-east-1a', '10.0.0.0/22');
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildRouteTable', () => {
    it('builds a route table', () => {
      const expected = {
        AppRouteTable1: {
          Type: 'AWS::EC2::RouteTable',
          Properties: {
            VpcId: {
              Ref: 'VPC',
            },
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
              {
                Key: 'Name',
                Value: {
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'app',
                      'us-east-1a',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };
      const actual = buildRouteTable('dev', 'App', 1, 'us-east-1a');
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildRouteTableAssociation', () => {
    it('builds a route table association', () => {
      const expected = {
        AppRouteTableAssociation1: {
          Type: 'AWS::EC2::SubnetRouteTableAssociation',
          Properties: {
            RouteTableId: {
              Ref: 'AppRouteTable1',
            },
            SubnetId: {
              Ref: 'AppSubnet1',
            },
          },
        },
      };
      const actual = buildRouteTableAssociation('App', 1);
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildRoute', () => {
    it('builds a route with a NAT Gateway', () => {
      const expected = {
        AppRoute1: {
          Type: 'AWS::EC2::Route',
          Properties: {
            DestinationCidrBlock: '0.0.0.0/0',
            NatGatewayId: {
              Ref: 'NatGateway1',
            },
            RouteTableId: {
              Ref: 'AppRouteTable1',
            },
          },
        },
      };
      const actual = buildRoute('App', 1, {
        NatGatewayId: 'NatGateway1',
      });
      expect(actual).toEqual(expected);
    });

    it('builds a route with an Internet Gateway', () => {
      const expected = {
        AppRoute1: {
          Type: 'AWS::EC2::Route',
          Properties: {
            DestinationCidrBlock: '0.0.0.0/0',
            GatewayId: {
              Ref: 'InternetGateway',
            },
            RouteTableId: {
              Ref: 'AppRouteTable1',
            },
          },
        },
      };
      const actual = buildRoute('App', 1, {
        GatewayId: 'InternetGateway',
      });
      expect(actual).toEqual(expected);
    });

    it('throws an error if no gateway provided', () => {
      expect(() => {
        buildRoute('App', 1);
      }).toThrow('Unable to create route: either NatGatewayId or GatewayId must be provided');
    });
  });

  describe('#buildLambdaSecurityGroup', () => {
    it('builds a Lambda security group with no options', () => {
      const expected = {
        LambdaExecutionSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Lambda Execution Group',
            VpcId: {
              Ref: 'VPC',
            },
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
              {
                Key: 'Name',
                Value: {
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'lambda-exec',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };
      const actual = buildLambdaSecurityGroup('dev');
      expect(actual).toEqual(expected);
    });

    it('builds a Lambda security group with a custom name', () => {
      const expected = {
        MyLambdaExecutionSecurityGroup: {
          Type: 'AWS::EC2::SecurityGroup',
          Properties: {
            GroupDescription: 'Lambda Execution Group',
            VpcId: {
              Ref: 'VPC',
            },
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
              {
                Key: 'Name',
                Value: {
                  'Fn::Join': [
                    '-',
                    [
                      {
                        Ref: 'AWS::StackName',
                      },
                      'lambda-exec',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };
      const actual = buildLambdaSecurityGroup('dev', {
        name: 'MyLambdaExecutionSecurityGroup',
      });
      expect(actual).toEqual(expected);
    });
  });
});

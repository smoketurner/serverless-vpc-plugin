const { buildRoute, buildRouteTable, buildRouteTableAssociation } = require('../src/routes');

describe('routes', () => {
  describe('#buildRouteTable', () => {
    it('builds a private route table', () => {
      const expected = {
        AppRouteTable1: {
          Type: 'AWS::EC2::RouteTable',
          Properties: {
            VpcId: {
              Ref: 'VPC',
            },
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-app-${AppSubnet1.AvailabilityZone}',
                },
              },
              {
                Key: 'Network',
                Value: 'Private',
              },
            ],
          },
        },
      };
      const actual = buildRouteTable('App', 1);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a public route table', () => {
      const expected = {
        PublicRouteTable1: {
          Type: 'AWS::EC2::RouteTable',
          Properties: {
            VpcId: {
              Ref: 'VPC',
            },
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-public-${PublicSubnet1.AvailabilityZone}',
                },
              },
              {
                Key: 'Network',
                Value: 'Public',
              },
            ],
          },
        },
      };
      const actual = buildRouteTable('Public', 1);
      expect(actual).toEqual(expected);
      expect.assertions(1);
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
      expect.assertions(1);
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
      expect.assertions(1);
    });

    it('builds a route with an Internet Gateway', () => {
      const expected = {
        PublicRoute1: {
          Type: 'AWS::EC2::Route',
          DependsOn: ['InternetGatewayAttachment'],
          Properties: {
            DestinationCidrBlock: '0.0.0.0/0',
            GatewayId: {
              Ref: 'InternetGateway',
            },
            RouteTableId: {
              Ref: 'PublicRouteTable1',
            },
          },
        },
      };
      const actual = buildRoute('Public', 1, {
        GatewayId: 'InternetGateway',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a route with an Instance Gateway', () => {
      const expected = {
        AppRoute1: {
          Type: 'AWS::EC2::Route',
          Properties: {
            DestinationCidrBlock: '0.0.0.0/0',
            InstanceId: {
              Ref: 'BastionInstance',
            },
            RouteTableId: {
              Ref: 'AppRouteTable1',
            },
          },
        },
      };
      const actual = buildRoute('App', 1, {
        InstanceId: 'BastionInstance',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('throws an error if no gateway provided', () => {
      expect(() => {
        buildRoute('App', 1);
      }).toThrow(
        'Unable to create route: either NatGatewayId, GatewayId or InstanceId must be provided',
      );
      expect.assertions(1);
    });
  });
});

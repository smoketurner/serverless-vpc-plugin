/**
 * Build a VPC
 *
 * @param {String} stage Serverless Stage
 * @param {Object} params
 * @return {Object}
 */
function buildVpc(stage, { name = 'VPC', cidrBlock = '10.0.0.0/16' } = {}) {
  return {
    [name]: {
      Type: 'AWS::EC2::VPC',
      Properties: {
        CidrBlock: cidrBlock,
        EnableDnsSupport: true,
        EnableDnsHostnames: true,
        InstanceTenancy: 'default',
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          },
          {
            Key: 'Name',
            Value: {
              Ref: 'AWS::StackName'
            }
          }
        ]
      }
    }
  };
}

/**
 * Build an InternetGateway
 *
 * @param {String} stage Serverless Stage
 * @param {Object} params
 * @return {Object}
 */
function buildInternetGateway(stage, { name = 'InternetGateway' } = {}) {
  return {
    [name]: {
      Type: 'AWS::EC2::InternetGateway',
      Properties: {
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          },
          {
            Key: 'Name',
            Value: {
              Ref: 'AWS::StackName'
            }
          }
        ]
      }
    }
  };
}

/**
 * Build an InternetGatewayAttachment
 *
 * @param {Object} params
 * @return {Object}
 */
function buildInternetGatewayAttachment({
  name = 'InternetGatewayAttachment'
} = {}) {
  return {
    [name]: {
      Type: 'AWS::EC2::VPCGatewayAttachment',
      Properties: {
        InternetGatewayId: {
          Ref: 'InternetGateway'
        },
        VpcId: {
          Ref: 'VPC'
        }
      }
    }
  };
}

/**
 * Create a subnet
 *
 * @param {String} stage Serverless Stage
 * @param {String} name Name of subnet
 * @param {Number} position Subnet position
 * @param {String} zone Availability zone
 * @param {String} cidrBlock Subnet CIDR block
 * @return {Object}
 */
function buildSubnet(stage, name, position, zone, cidrBlock) {
  const cfName = `${name}Subnet${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::Subnet',
      Properties: {
        AvailabilityZone: zone,
        CidrBlock: cidrBlock,
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          },
          {
            Key: 'Name',
            Value: {
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName'
                  },
                  name.toLowerCase(),
                  zone
                ]
              ]
            }
          }
        ],
        VpcId: {
          Ref: 'VPC'
        }
      }
    }
  };
}

/**
 * Build a RouteTable in a given AZ
 *
 * @param {String} stage Serverless Stage
 * @param {String} name
 * @param {Number} position
 * @param {String} zone
 * @return {Object}
 */
function buildRouteTable(stage, name, position, zone) {
  const cfName = `${name}RouteTable${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::RouteTable',
      Properties: {
        VpcId: {
          Ref: 'VPC'
        },
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          },
          {
            Key: 'Name',
            Value: {
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName'
                  },
                  name.toLowerCase(),
                  zone
                ]
              ]
            }
          }
        ]
      }
    }
  };
}

/**
 * Build a RouteTableAssociation
 *
 * @param {String} name
 * @param {Number} position
 * @return {Object}
 */
function buildRouteTableAssociation(name, position) {
  const cfName = `${name}RouteTableAssociation${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::SubnetRouteTableAssociation',
      Properties: {
        RouteTableId: {
          Ref: `${name}RouteTable${position}`
        },
        SubnetId: {
          Ref: `${name}Subnet${position}`
        }
      }
    }
  };
}

/**
 * Build a Route for a NatGateway or InternetGateway
 *
 * @param {String} name
 * @param {Number} position
 * @param {Object} params
 * @return {Object}
 */
function buildRoute(
  name,
  position,
  { NatGatewayId = null, GatewayId = null } = {}
) {
  const route = {
    Type: 'AWS::EC2::Route',
    Properties: {
      DestinationCidrBlock: '0.0.0.0/0',
      RouteTableId: {
        Ref: `${name}RouteTable${position}`
      }
    }
  };

  if (NatGatewayId) {
    route.Properties.NatGatewayId = {
      Ref: NatGatewayId
    };
  } else if (GatewayId) {
    route.Properties.GatewayId = {
      Ref: GatewayId
    };
  } else {
    throw new Error(
      'Unable to create route: either NatGatewayId or GatewayId must be provided'
    );
  }

  const cfName = `${name}Route${position}`;
  return {
    [cfName]: route
  };
}

/**
 * Build a SecurityGroup to be used by Lambda's when they execute.
 *
 * @param {String} stage
 * @param {Object} params
 * @return {Object}
 */
function buildLambdaSecurityGroup(
  stage,
  { name = 'LambdaExecutionSecurityGroup' } = {}
) {
  return {
    [name]: {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: {
        GroupDescription: 'Lambda Execution Group',
        VpcId: {
          Ref: 'VPC'
        },
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          },
          {
            Key: 'Name',
            Value: {
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName'
                  },
                  'lambda-exec'
                ]
              ]
            }
          }
        ]
      }
    }
  };
}

module.exports = {
  buildVpc,
  buildInternetGateway,
  buildInternetGatewayAttachment,
  buildLambdaSecurityGroup,
  buildSubnet,
  buildRoute,
  buildRouteTable,
  buildRouteTableAssociation
};

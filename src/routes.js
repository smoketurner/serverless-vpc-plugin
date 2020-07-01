const { PUBLIC_SUBNET } = require('./constants');

/**
 * Build a RouteTable in a given AZ
 *
 * @param {String} name
 * @param {Number} position
 * @return {Object}
 */
function buildRouteTable(name, position) {
  const cfName = `${name}RouteTable${position}`;

  const Tags = [
    {
      Key: 'Name',
      Value: {
        'Fn::Sub': `\${AWS::StackName}-${name.toLowerCase()}-\${${name}Subnet${position}.AvailabilityZone}`,
      },
    },
  ];

  if (name === PUBLIC_SUBNET) {
    Tags.push({ Key: 'Network', Value: 'Public' });
  } else {
    Tags.push({ Key: 'Network', Value: 'Private' });
  }

  return {
    [cfName]: {
      Type: 'AWS::EC2::RouteTable',
      Properties: {
        VpcId: {
          Ref: 'VPC',
        },
        Tags,
      },
    },
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
          Ref: `${name}RouteTable${position}`,
        },
        SubnetId: {
          Ref: `${name}Subnet${position}`,
        },
      },
    },
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
  { NatGatewayId = null, GatewayId = null, InstanceId = null } = {},
) {
  const route = {
    Type: 'AWS::EC2::Route',
    Properties: {
      DestinationCidrBlock: '0.0.0.0/0',
      RouteTableId: {
        Ref: `${name}RouteTable${position}`,
      },
    },
  };

  // fixes "route table rtb-x and network gateway igw-x belong to different networks"
  // see https://stackoverflow.com/questions/48865762
  if (name === PUBLIC_SUBNET) {
    route.DependsOn = ['InternetGatewayAttachment'];
  }
  if (NatGatewayId) {
    route.Properties.NatGatewayId = {
      Ref: NatGatewayId,
    };
  } else if (GatewayId) {
    route.Properties.GatewayId = {
      Ref: GatewayId,
    };
  } else if (InstanceId) {
    route.Properties.InstanceId = {
      Ref: InstanceId,
    };
  } else {
    throw new Error(
      'Unable to create route: either NatGatewayId, GatewayId or InstanceId must be provided',
    );
  }

  const cfName = `${name}Route${position}`;
  return {
    [cfName]: route,
  };
}

module.exports = {
  buildRoute,
  buildRouteTable,
  buildRouteTableAssociation,
};

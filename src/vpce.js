const { APP_SUBNET } = require('./constants');

/**
 * Build a VPCEndpoint
 *
 * @param {String} service
 * @param {Object} params
 * @return {Object}
 */
function buildVPCEndpoint(service, { routeTableIds = [], subnetIds = [] } = {}) {
  const endpoint = {
    Type: 'AWS::EC2::VPCEndpoint',
    Properties: {
      ServiceName: {
        'Fn::Sub': `com.amazonaws.\${AWS::Region}.${service}`,
      },
      VpcId: {
        Ref: 'VPC',
      },
    },
  };

  // @see https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints.html
  if (service === 's3' || service === 'dynamodb') {
    endpoint.Properties.VpcEndpointType = 'Gateway';
    endpoint.Properties.RouteTableIds = routeTableIds;
    endpoint.Properties.PolicyDocument = {
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Resource: '*',
        },
      ],
    };
    if (service === 's3') {
      endpoint.Properties.PolicyDocument.Statement[0].Action = 's3:*';
    } else if (service === 'dynamodb') {
      endpoint.Properties.PolicyDocument.Statement[0].Action = 'dynamodb:*';
    }
  } else {
    endpoint.Properties.VpcEndpointType = 'Interface';
    endpoint.Properties.SubnetIds = subnetIds;
    endpoint.Properties.PrivateDnsEnabled = true;
    endpoint.Properties.SecurityGroupIds = [
      {
        Ref: 'AppSecurityGroup',
      },
    ];
  }

  const parts = service.split(/[-_.]/g);
  parts.push('VPCEndpoint');
  const cfName = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');

  return {
    [cfName]: endpoint,
  };
}

/**
 * Build VPC endpoints for a given number of services and zones
 *
 * @param {Array} services Array of VPC endpoint services
 * @param {Number} numZones Number of availability zones
 * @return {Object}
 */
function buildEndpointServices(services = [], numZones = 0) {
  if (!Array.isArray(services) || services.length < 1) {
    return {};
  }
  if (numZones < 1) {
    return {};
  }

  const subnetIds = [];
  const routeTableIds = [];
  for (let i = 1; i <= numZones; i += 1) {
    subnetIds.push({ Ref: `${APP_SUBNET}Subnet${i}` });
    routeTableIds.push({ Ref: `${APP_SUBNET}RouteTable${i}` });
  }

  const resources = {};
  services.forEach((service) => {
    Object.assign(resources, buildVPCEndpoint(service, { routeTableIds, subnetIds }));
  });

  return resources;
}

module.exports = {
  buildEndpointServices,
  buildVPCEndpoint,
};

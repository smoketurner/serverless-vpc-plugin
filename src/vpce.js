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
        'Fn::Join': [
          '.',
          [
            'com.amazonaws',
            {
              Ref: 'AWS::Region',
            },
            service,
          ],
        ],
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
          /*
          TODO 11/21: We should restrict the VPC Endpoint to only the Lambda
          IAM role, but this doesn't work.

          Principal: {
            AWS: {
              'Fn::GetAtt': [
                'IamRoleLambdaExecution',
                'Arn',
              ],
            },
          }, */
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
        Ref: 'LambdaEndpointSecurityGroup',
      },
    ];
  }

  const parts = service.split(/[-_.]/g);
  parts.push('VPCEndpoint');
  const cfName = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');

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
  services.forEach(service => {
    Object.assign(resources, buildVPCEndpoint(service, { routeTableIds, subnetIds }));
  });

  return resources;
}

/**
 * Build a SecurityGroup to allow the Lambda's access to VPC endpoints over HTTPS.
 *
 * @param {Object} params
 * @return {Object}
 */
function buildLambdaVPCEndpointSecurityGroup({ name = 'LambdaEndpointSecurityGroup' } = {}) {
  return {
    [name]: {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: {
        GroupDescription: 'Lambda access to VPC endpoints',
        VpcId: {
          Ref: 'VPC',
        },
        SecurityGroupIngress: [
          {
            SourceSecurityGroupId: {
              Ref: 'LambdaExecutionSecurityGroup',
            },
            Description: 'Allow inbound HTTPS traffic from LambdaExecutionSecurityGroup',
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
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
                  'lambda-endpoint',
                ],
              ],
            },
          },
        ],
      },
    },
  };
}

module.exports = {
  buildEndpointServices,
  buildVPCEndpoint,
  buildLambdaVPCEndpointSecurityGroup,
};

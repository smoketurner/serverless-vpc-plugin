const CIDR = require('cidr-split');
const merge = require('lodash.merge');

/**
 * @see https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
 */
const DEFAULT_VPC_EIP_LIMIT = 5;

class ServerlessVpcPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};

    this.provider = this.serverless.getProvider('aws');

    this.hooks = {
      'after:package:initialize': this.afterInitialize.bind(this),
    };
  }

  async afterInitialize() {
    let cidrBlock = '10.0.0.0/16';
    let useNatGateway = false;
    let zones = [];
    let services = ['s3', 'dynamodb'];
    let skipDbCreation = false;

    const { vpcConfig } = this.serverless.service.custom;

    if (vpcConfig) {
      if (vpcConfig.cidrBlock && typeof vpcConfig.cidrBlock === 'string') {
        ({ cidrBlock } = vpcConfig);
      }
      if ('useNatGateway' in vpcConfig && typeof vpcConfig.useNatGateway === 'boolean') {
        ({ useNatGateway } = vpcConfig);
      }
      if (vpcConfig.zones && Array.isArray(vpcConfig.zones) && vpcConfig.zones.length > 0) {
        ({ zones } = vpcConfig);
      }
      if (vpcConfig.services
          && Array.isArray(vpcConfig.services)
          && vpcConfig.services.length > 0) {
        services = vpcConfig.services.map(s => s.trim().toLowerCase());
      }
      if ('skipDbCreation' in vpcConfig && typeof vpcConfig.skipDbCreation === 'boolean') {
        ({ skipDbCreation } = vpcConfig);
      }
    }

    const region = this.provider.getRegion();

    if (zones.length < 1) {
      this.serverless.cli.log(`Discovering available zones in ${region}...`);
      zones = await this.getZonesPerRegion(region);
    }
    const numZones = zones.length;

    if (useNatGateway && numZones > DEFAULT_VPC_EIP_LIMIT) {
      this.serverless.cli.log(`WARNING: Number of zones (${numZones} is greater than default EIP limit (${DEFAULT_VPC_EIP_LIMIT}). Please ensure you requested an AWS EIP limit increase.`);
    }

    this.serverless.cli.log(`Generating a VPC in ${region} (${cidrBlock}) across ${numZones} availability zones: ${zones}`);

    merge(
      this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
      this.buildVpc({ cidrBlock }),
      this.buildInternetGateway(),
      ServerlessVpcPlugin.buildInternetGatewayAttachment(),
      this.buildAvailabilityZones({
        cidrBlock, zones, useNatGateway, skipDbCreation,
      }),
      this.buildLambdaSecurityGroup(),
    );

    if (services.length > 0) {
      const invalid = await this.validateServices(region, services);
      if (invalid.length > 0) {
        throw new Error(`WARNING: Requested services are not available in ${region}: ${invalid.join(', ')}`);
      }
      this.serverless.cli.log(`Provisioning VPC endpoints for: ${services.join(', ')}`);

      merge(
        this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
        ServerlessVpcPlugin.buildEndpointServices({ services, numZones }),
        this.buildLambdaVPCEndpointSecurityGroup(),
      );
    }

    if (!skipDbCreation) {
      if (numZones < 2) {
        this.serverless.cli.log('WARNING: less than 2 AZs; skipping subnet group provisioning');
      } else {
        merge(
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
          this.buildRDSSubnetGroup({ numZones }),
          this.buildRedshiftSubnetGroup({ numZones }),
          ServerlessVpcPlugin.buildElastiCacheSubnetGroup({ numZones }),
          ServerlessVpcPlugin.buildDAXSubnetGroup({ numZones }),
        );
      }
    }
  }

  /**
   * Return an array of availability zones for a given region.
   *
   * @param {String} region
   * @return {Array}
   */
  async getZonesPerRegion(region) {
    const params = {
      Filters: [
        {
          Name: 'region-name',
          Values: [region],
        },
      ],
    };
    return this.provider.request('EC2', 'describeAvailabilityZones', params).then(
      data => data.AvailabilityZones
        .filter(z => z.State === 'available')
        .map(z => z.ZoneName)
        .sort(),
    );
  }

  /**
   * Return an array of available VPC endpoint services for a given region.
   *
   * @return {Array}
   */
  async getVpcEndpointServicesPerRegion() {
    const params = {
      MaxResults: 1000,
    };
    return this.provider.request('EC2', 'describeVpcEndpointServices', params).then(
      data => data.ServiceNames.sort(),
    );
  }

  /**
   * Return an array of provided services that are not available within the provided region.
   *
   * @param {String} region
   * @param {Array} services
   * @return {Array}
   */
  async validateServices(region, services) {
    const available = await this.getVpcEndpointServicesPerRegion();
    return services.map(service => `com.amazonaws.${region}.${service}`).filter(service => !available.includes(service));
  }

  /**
   * Build a VPC
   *
   * @param {Object} params
   * @return {Object}
   */
  buildVpc({ name = 'VPC', cidrBlock = '10.0.0.0/16' } = {}) {
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
              Value: this.provider.getStage(),
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
  }

  /**
   * Build an InternetGateway
   *
   * @param {Object} params
   * @return {Object}
   */
  buildInternetGateway({ name = 'InternetGateway' } = {}) {
    return {
      [name]: {
        Type: 'AWS::EC2::InternetGateway',
        Properties: {
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
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
  }

  /**
   * Build an InternetGatewayAttachment
   *
   * @param {Object} params
   * @return {Object}
   */
  static buildInternetGatewayAttachment({ name = 'InternetGatewayAttachment' } = {}) {
    return {
      [name]: {
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
   * Split a /16 CIDR block into /20 CIDR blocks.
   *
   * @param {String} cidrBlock
   * @return {Array}
   */
  static splitVpc(cidrBlock) {
    return CIDR.fromString(cidrBlock)
      .split()
      .map(cidr => cidr.split())
      .reduce((all, halves) => all.concat(...halves))
      .map(cidr => cidr.split())
      .reduce((all, halves) => all.concat(...halves))
      .map(cidr => cidr.split())
      .reduce((all, halves) => all.concat(...halves));
  }

  /**
   * Builds the Availability Zones for the region.
   *
   * 1.) Splits the VPC CIDR Block into /20 subnets, one per AZ.
   * 2.) Split each AZ /20 CIDR Block into two /21 subnets
   * 3.) Use the first /21 subnet for Applications
   * 3.) Split the second /21 subnet into two /22 subnets: one Public subnet (for load balancers),
   *     and one for databases (RDS, ElastiCache, and Redshift)
   *
   * @param {String} cidrBlock VPC CIDR Block
   * @param {Array} zones Array of availability zones
   * @param {Boolean} useNatGateway Whether to create NAT Gateways or not
   * @param {Boolean} skipDbCreation Whether to skip creating the DBSubnet or not
   * @return {Object}
   */
  buildAvailabilityZones({
    cidrBlock,
    zones = [],
    useNatGateway = true,
    skipDbCreation = false,
  } = {}) {
    if (!Array.isArray(zones) || zones.length < 1) {
      return {};
    }

    const azCidrBlocks = ServerlessVpcPlugin.splitVpc(cidrBlock); // VPC subnet is a /16
    const resources = {};

    zones.forEach((zone, index) => {
      const azCidrBlock = azCidrBlocks[index]; // AZ subnet is a /20
      const position = index + 1;

      let subnets = [];

      const azSubnets = CIDR.fromString(azCidrBlock).split().map(cidr => cidr.toString());
      subnets.push(azSubnets[0]); // Application subnet is a /21

      const publicSubnets = CIDR.fromString(azSubnets[1]).split().map(cidr => cidr.toString());
      subnets = subnets.concat(publicSubnets); // Public and DB subnets are both /22

      if (useNatGateway) {
        merge(
          resources,
          ServerlessVpcPlugin.buildEIP(position),
          this.buildNatGateway(position, zone),
        );
      }

      const params = {
        name: 'App',
        position,
      };

      if (useNatGateway) {
        params.NatGatewayId = `NatGateway${position}`;
      } else {
        params.GatewayId = 'InternetGateway';
      }

      merge(
        resources,

        // App Subnet
        this.buildSubnet('App', position, zone, subnets[0]),
        this.buildRouteTable('App', position, zone),
        ServerlessVpcPlugin.buildRouteTableAssociation('App', position),
        ServerlessVpcPlugin.buildRoute(params),

        // Public Subnet
        this.buildSubnet('Public', position, zone, subnets[1]),
        this.buildRouteTable('Public', position, zone),
        ServerlessVpcPlugin.buildRouteTableAssociation('Public', position),
        ServerlessVpcPlugin.buildRoute({
          name: 'Public',
          position,
          GatewayId: 'InternetGateway',
        }),
      );

      if (!skipDbCreation) {
        // DB Subnet
        merge(
          resources,
          this.buildSubnet('DB', position, zone, subnets[2]),
          this.buildRouteTable('DB', position, zone),
          ServerlessVpcPlugin.buildRouteTableAssociation('DB', position),
        );
      }
    });

    return resources;
  }

  /**
   * Create a subnet
   *
   * @param {String} name
   * @param {Number} position
   * @param {String} zone
   * @param {String} cidrBlock
   * @return {Object}
   */
  buildSubnet(name, position, zone, cidrBlock) {
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
              Value: this.provider.getStage(),
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
                    name.toLowerCase(),
                    zone,
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
  }

  /**
   * Build an EIP
   *
   * @param {Number} position
   * @return {Object}
   */
  static buildEIP(position) {
    const cfName = `EIP${position}`;
    return {
      [cfName]: {
        Type: 'AWS::EC2::EIP',
        Properties: {
          Domain: 'vpc',
        },
      },
    };
  }

  /**
   * Build a NatGateway in a given AZ
   *
   * @param {Number} position
   * @param {String} zone
   * @return {Object}
   */
  buildNatGateway(position, zone) {
    const cfName = `NatGateway${position}`;
    return {
      [cfName]: {
        Type: 'AWS::EC2::NatGateway',
        Properties: {
          AllocationId: {
            'Fn::GetAtt': [
              `EIP${position}`,
              'AllocationId',
            ],
          },
          SubnetId: {
            Ref: `PublicSubnet${position}`,
          },
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
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
                    zone,
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
   * Build a RouteTable in a given AZ
   *
   * @param {String} name
   * @param {Number} position
   * @param {String} zone
   * @return {Object}
   */
  buildRouteTable(name, position, zone) {
    const cfName = `${name}RouteTable${position}`;
    return {
      [cfName]: {
        Type: 'AWS::EC2::RouteTable',
        Properties: {
          VpcId: {
            Ref: 'VPC',
          },
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
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
                    name.toLowerCase(),
                    zone,
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
   * Build a RouteTableAssociation
   *
   * @param {String} name
   * @param {Number} position
   * @return {Object}
   */
  static buildRouteTableAssociation(name, position) {
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
   * @param {Object} params
   * @return {Object}
   */
  static buildRoute({
    name, position, NatGatewayId = null, GatewayId = null,
  } = {}) {
    const route = {
      Type: 'AWS::EC2::Route',
      Properties: {
        DestinationCidrBlock: '0.0.0.0/0',
        RouteTableId: {
          Ref: `${name}RouteTable${position}`,
        },
      },
    };

    if (NatGatewayId) {
      route.Properties.NatGatewayId = {
        Ref: NatGatewayId,
      };
    } else if (GatewayId) {
      route.Properties.GatewayId = {
        Ref: GatewayId,
      };
    } else {
      throw new Error('Unable to create route: either NatGatewayId or GatewayId must be provided');
    }

    const cfName = `${name}Route${position}`;
    return {
      [cfName]: route,
    };
  }

  /**
   * Build an RDSubnetGroup for a given number of zones
   *
   * @param {Objects} params
   * @return {Object}
   */
  buildRDSSubnetGroup({ name = 'RDSSubnetGroup', numZones = 0 } = {}) {
    if (numZones < 1) {
      return {};
    }

    const subnetIds = [];
    for (let i = 1; i <= numZones; i += 1) {
      subnetIds.push({ Ref: `DBSubnet${i}` });
    }

    return {
      [name]: {
        Type: 'AWS::RDS::DBSubnetGroup',
        Properties: {
          DBSubnetGroupName: {
            Ref: 'AWS::StackName',
          },
          DBSubnetGroupDescription: {
            Ref: 'AWS::StackName',
          },
          SubnetIds: subnetIds,
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
            },
          ],
        },
      },
    };
  }

  /**
   * Build an ElastiCacheSubnetGroup for a given number of zones
   *
   * @param {Object} params
   * @return {Object}
   */
  static buildElastiCacheSubnetGroup({ name = 'ElastiCacheSubnetGroup', numZones = 0 } = {}) {
    if (numZones < 1) {
      return {};
    }

    const subnetIds = [];
    for (let i = 1; i <= numZones; i += 1) {
      subnetIds.push({ Ref: `DBSubnet${i}` });
    }

    return {
      [name]: {
        Type: 'AWS::ElastiCache::SubnetGroup',
        Properties: {
          CacheSubnetGroupName: {
            Ref: 'AWS::StackName',
          },
          Description: {
            Ref: 'AWS::StackName',
          },
          SubnetIds: subnetIds,
        },
      },
    };
  }

  /**
   * Build an RedshiftSubnetGroup for a given number of zones
   *
   * @param {Object} params
   * @return {Object}
   */
  buildRedshiftSubnetGroup({ name = 'RedshiftSubnetGroup', numZones = 0 } = {}) {
    if (numZones < 1) {
      return {};
    }

    const subnetIds = [];
    for (let i = 1; i <= numZones; i += 1) {
      subnetIds.push({ Ref: `DBSubnet${i}` });
    }

    return {
      [name]: {
        Type: 'AWS::Redshift::ClusterSubnetGroup',
        Properties: {
          Description: {
            Ref: 'AWS::StackName',
          },
          SubnetIds: subnetIds,
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
            },
          ],
        },
      },
    };
  }

  /**
   * Build an DAXSubnetGroup for a given number of zones
   *
   * @param {Object} params
   * @return {Object}
   */
  static buildDAXSubnetGroup({ name = 'DAXSubnetGroup', numZones = 0 } = {}) {
    if (numZones < 1) {
      return {};
    }

    const subnetIds = [];
    for (let i = 1; i <= numZones; i += 1) {
      subnetIds.push({ Ref: `DBSubnet${i}` });
    }

    return {
      [name]: {
        Type: 'AWS::DAX::SubnetGroup',
        Properties: {
          SubnetGroupName: {
            Ref: 'AWS::StackName',
          },
          Description: {
            Ref: 'AWS::StackName',
          },
          SubnetIds: subnetIds,
        },
      },
    };
  }

  /**
   * Build VPC endpoints for a given number of services and zones
   *
   * @param {Object} params
   * @return {Object}
   */
  static buildEndpointServices({ services = [], numZones = 0 } = {}) {
    if (!services || services.length < 1) {
      return {};
    }
    if (numZones < 1) {
      return {};
    }

    const subnetIds = [];
    const routeTableIds = [];
    for (let i = 1; i <= numZones; i += 1) {
      subnetIds.push({ Ref: `AppSubnet${i}` });
      routeTableIds.push({ Ref: `AppRouteTable${i}` });
    }

    const resources = {};
    services.forEach((service) => {
      merge(resources, ServerlessVpcPlugin.buildVPCEndpoint({ service, routeTableIds, subnetIds }));
    });

    return resources;
  }

  /**
   * Build a VPCEndpoint
   *
   * @param {Object} params
   * @return {Object}
   */
  static buildVPCEndpoint({ service, routeTableIds = [], subnetIds = [] } = {}) {
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
    } else {
      endpoint.Properties.VpcEndpointType = 'Interface';
      endpoint.Properties.SubnetIds = subnetIds;
      endpoint.Properties.PrivateDnsEnabled = true;
      endpoint.Properties.SecurityGroupIds = [{
        Ref: 'LambdaEndpointSecurityGroup',
      }];
    }

    const parts = service.split(/[-_.]/g);
    parts.push('VPCEndpoint');
    const cfName = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');

    return {
      [cfName]: endpoint,
    };
  }

  /**
   * Build a SecurityGroup to be used by Lambda's when they execute.
   *
   * @param {Object} params
   * @return {Object}
   */
  buildLambdaSecurityGroup({ name = 'LambdaExecutionSecurityGroup' } = {}) {
    return {
      [name]: {
        Type: 'AWS::EC2::SecurityGroup',
        Properties: {
          GroupDescription: 'Lambda Execution Group',
          VpcId: {
            Ref: 'VPC',
          },
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
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
  }

  /**
   * Build a SecurityGroup to allow the Lambda's access to VPC endpoints over HTTPS.
   *
   * @param {Object} params
   * @return {Object}
   */
  buildLambdaVPCEndpointSecurityGroup({ name = 'LambdaEndpointSecurityGroup' } = {}) {
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
              IpProtocol: 'tcp',
              FromPort: 443,
              ToPort: 443,
            },
          ],
          Tags: [
            {
              Key: 'STAGE',
              Value: this.provider.getStage(),
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
}

module.exports = ServerlessVpcPlugin;

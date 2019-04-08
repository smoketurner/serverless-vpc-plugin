const CIDR = require('cidr-split');

const { DEFAULT_VPC_EIP_LIMIT, APP_SUBNET, PUBLIC_SUBNET, DB_SUBNET } = require('./constants');
const {
  buildVpc,
  buildInternetGateway,
  buildInternetGatewayAttachment,
  buildLambdaSecurityGroup,
  buildSubnet,
  buildRoute,
  buildRouteTable,
  buildRouteTableAssociation,
} = require('./vpc');
const { buildAppNetworkAcl, buildPublicNetworkAcl, buildDBNetworkAcl } = require('./nacl');
const {
  buildRDSSubnetGroup,
  buildElastiCacheSubnetGroup,
  buildRedshiftSubnetGroup,
  buildDAXSubnetGroup,
} = require('./subnet_groups');
const { buildEndpointServices, buildLambdaVPCEndpointSecurityGroup } = require('./vpce');
const { buildEIP, buildNatGateway } = require('./natgw');
const { buildLogBucket, buildLogBucketPolicy, buildVpcFlowLogs } = require('./flow_logs');

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
    let zones = [];
    let services = ['s3', 'dynamodb'];
    let createNatGateway = false;
    let createNetworkAcl = false;
    let createDbSubnet = true;
    let createFlowLogs = false;

    const { vpcConfig } = this.serverless.service.custom;

    if (vpcConfig) {
      if (vpcConfig.cidrBlock && typeof vpcConfig.cidrBlock === 'string') {
        ({ cidrBlock } = vpcConfig);
      }

      if ('createNatGateway' in vpcConfig) {
        ({ createNatGateway } = vpcConfig);
      } else if ('useNatGateway' in vpcConfig) {
        createNatGateway = vpcConfig.useNatGateway;
      }

      if ('createNetworkAcl' in vpcConfig && typeof vpcConfig.createNetworkAcl === 'boolean') {
        ({ createNetworkAcl } = vpcConfig);
      } else if ('useNetworkAcl' in vpcConfig && typeof vpcConfig.useNetworkAcl === 'boolean') {
        createNetworkAcl = vpcConfig.useNetworkAcl;
      }

      if (Array.isArray(vpcConfig.zones) && vpcConfig.zones.length > 0) {
        ({ zones } = vpcConfig);
      }
      if (Array.isArray(vpcConfig.services) && vpcConfig.services.length > 0) {
        services = vpcConfig.services.map(s => s.trim().toLowerCase());
      }

      if ('createDbSubnet' in vpcConfig && typeof vpcConfig.createDbSubnet === 'boolean') {
        ({ createDbSubnet } = vpcConfig);
      } else if ('skipDbCreation' in vpcConfig && typeof vpcConfig.skipDbCreation === 'boolean') {
        createDbSubnet = !vpcConfig.skipDbCreation;
      }

      if ('createFlowLogs' in vpcConfig && typeof vpcConfig.createFlowLogs === 'boolean') {
        ({ createFlowLogs } = vpcConfig);
      }
    }

    const region = this.provider.getRegion();

    if (zones.length < 1) {
      this.serverless.cli.log(`Discovering available zones in ${region}...`);
      zones = await this.getZonesPerRegion(region);
    }
    const numZones = zones.length;

    if (createNatGateway) {
      if (typeof createNatGateway !== 'boolean' && typeof createNatGateway !== 'number') {
        throw new this.serverless.classes.Error(
          'createNatGateway must be either a boolean or a number',
        );
      }
      if (typeof createNatGateway === 'boolean') {
        createNatGateway = createNatGateway ? numZones : 0;
      } else if (createNatGateway > numZones) {
        createNatGateway = numZones;
      }
      if (createNatGateway > DEFAULT_VPC_EIP_LIMIT) {
        this.serverless.cli.log(
          `WARNING: Number of gateways (${createNatGateway} is greater than default ` +
            `EIP limit (${DEFAULT_VPC_EIP_LIMIT}). Please ensure you requested ` +
            `an AWS EIP limit increase.`,
        );
      }
    }

    this.serverless.cli.log(
      `Generating a VPC in ${region} (${cidrBlock}) ` +
        `across ${numZones} availability zones: ${zones}`,
    );

    const providerObj = this.serverless.service.provider;
    const resources = providerObj.compiledCloudFormationTemplate.Resources;

    Object.assign(
      resources,
      buildVpc({ cidrBlock }),
      buildInternetGateway(),
      buildInternetGatewayAttachment(),
      ServerlessVpcPlugin.buildAvailabilityZones(cidrBlock, {
        zones,
        numNatGateway: createNatGateway,
        createDbSubnet,
        createNetworkAcl,
      }),
      buildLambdaSecurityGroup(),
    );

    if (services.length > 0) {
      const invalid = await this.validateServices(region, services);
      if (invalid.length > 0) {
        throw new this.serverless.classes.Error(
          `WARNING: Requested services are not available in ${region}: ${invalid.join(', ')}`,
        );
      }
      this.serverless.cli.log(`Provisioning VPC endpoints for: ${services.join(', ')}`);

      Object.assign(
        resources,
        buildEndpointServices({ services, numZones }),
        buildLambdaVPCEndpointSecurityGroup(),
      );
    }

    if (createDbSubnet) {
      if (numZones < 2) {
        this.serverless.cli.log('WARNING: less than 2 AZs; skipping subnet group provisioning');
      } else {
        Object.assign(
          resources,
          buildRDSSubnetGroup({ numZones }),
          buildRedshiftSubnetGroup({ numZones }),
          buildElastiCacheSubnetGroup({ numZones }),
          buildDAXSubnetGroup({ numZones }),
        );
      }
    }

    if (createFlowLogs) {
      this.serverless.cli.log('Enabling VPC Flow Logs to S3');
      Object.assign(resources, buildLogBucket(), buildLogBucketPolicy(), buildVpcFlowLogs());
    }

    this.serverless.cli.log('Updating Lambda VPC configuration');
    const { vpc = {} } = providerObj;

    if (!Array.isArray(vpc.securityGroupIds)) {
      vpc.securityGroupIds = [];
    }
    vpc.securityGroupIds.push({ Ref: 'LambdaExecutionSecurityGroup' });

    if (!Array.isArray(vpc.subnetIds)) {
      vpc.subnetIds = [];
    }
    for (let i = 1; i <= numZones; i += 1) {
      vpc.subnetIds.push({ Ref: `${APP_SUBNET}Subnet${i}` });
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
    return this.provider.request('EC2', 'describeAvailabilityZones', params).then(data =>
      data.AvailabilityZones.filter(z => z.State === 'available')
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
    return this.provider
      .request('EC2', 'describeVpcEndpointServices', params)
      .then(data => data.ServiceNames.sort());
  }

  /**
   * Return an array of provided services that are not available within the provided region.
   *
   * @param {String} region
   * @param {Array} services
   * @return {Array}
   */
  async validateServices(region, services = []) {
    if (!Array.isArray(services) || services.length < 1) {
      return [];
    }

    const available = await this.getVpcEndpointServicesPerRegion();
    return services
      .map(service => `com.amazonaws.${region}.${service}`)
      .filter(service => !available.includes(service));
  }

  /**
   * Split a /16 CIDR block into /20 CIDR blocks.
   *
   * @param {String} cidrBlock VPC CIDR block
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
   * Splits the /16 VPC CIDR block into /20 subnets per AZ:
   *
   * Application subnet = /21
   * Public subnet = /22
   * Database subnet = /22
   *
   * @param {String} cidrBlock VPC CIDR block
   * @param {Array} zones Array of availability zones
   * @return {Map}
   */
  static splitSubnets(cidrBlock, zones = []) {
    const mapping = new Map();

    if (!cidrBlock || !Array.isArray(zones) || zones.length < 1) {
      return mapping;
    }

    const azCidrBlocks = ServerlessVpcPlugin.splitVpc(cidrBlock); // VPC subnet is a /16

    const publicSubnets = [];
    const appSubnets = [];
    const dbSubnets = [];

    zones.forEach((zone, index) => {
      const azCidrBlock = azCidrBlocks[index]; // AZ subnet is a /20
      const subnets = [];

      const azSubnets = CIDR.fromString(azCidrBlock)
        .split()
        .map(cidr => cidr.toString());
      subnets.push(azSubnets[0]); // Application subnet is a /21

      const smallerSubnets = CIDR.fromString(azSubnets[1])
        .split()
        .map(cidr => cidr.toString());
      subnets.push(...smallerSubnets); // Public and DB subnets are both /22

      const parts = [
        [APP_SUBNET, subnets[0]],
        [PUBLIC_SUBNET, subnets[1]],
        [DB_SUBNET, subnets[2]],
      ];

      appSubnets.push(subnets[0]);
      publicSubnets.push(subnets[1]);
      dbSubnets.push(subnets[2]);

      mapping.set(zone, new Map(parts));
    });

    mapping.set(PUBLIC_SUBNET, publicSubnets);
    mapping.set(APP_SUBNET, appSubnets);
    mapping.set(DB_SUBNET, dbSubnets);

    return mapping;
  }

  /**
   * Builds the Availability Zones for the region.
   *
   * 1.) Splits the VPC CIDR Block into /20 subnets, one per AZ.
   * 2.) Split each AZ /20 CIDR Block into two /21 subnets
   * 3.) Use the first /21 subnet for Applications
   * 4.) Split the second /21 subnet into two /22 subnets: one Public subnet (for load balancers),
   *     and one for databases (RDS, ElastiCache, and Redshift)
   *
   * @param {String} cidrBlock VPC CIDR Block
   * @param {Array} zones Array of availability zones
   * @param {Number} numNatGateway Number of NAT gateways (and EIPs) to provision
   * @param {Boolean} createDbSubnet Whether to create the DBSubnet or not
   * @param {Boolean} createNetworkAcl Whether to create Network ACLs or not
   * @return {Object}
   */
  static buildAvailabilityZones(
    cidrBlock,
    { zones = [], numNatGateway = 0, createDbSubnet = true, createNetworkAcl = false } = {},
  ) {
    if (!cidrBlock) {
      return {};
    }
    if (!Array.isArray(zones) || zones.length < 1) {
      return {};
    }

    const subnets = ServerlessVpcPlugin.splitSubnets(cidrBlock, zones);
    const resources = {};

    if (numNatGateway > 0) {
      for (let index = 0; index < numNatGateway; index += 1) {
        Object.assign(resources, buildEIP(index + 1), buildNatGateway(index + 1, zones[index]));
      }
    }

    zones.forEach((zone, index) => {
      const position = index + 1;

      const params = {};
      if (numNatGateway > 0) {
        params.NatGatewayId = `NatGateway${(index % numNatGateway) + 1}`;
      } else {
        params.GatewayId = 'InternetGateway';
      }

      Object.assign(
        resources,

        // App Subnet
        buildSubnet(APP_SUBNET, position, zone, subnets.get(zone).get(APP_SUBNET)),
        buildRouteTable(APP_SUBNET, position, zone),
        buildRouteTableAssociation(APP_SUBNET, position),
        buildRoute(APP_SUBNET, position, params),

        // Public Subnet
        buildSubnet(PUBLIC_SUBNET, position, zone, subnets.get(zone).get(PUBLIC_SUBNET)),
        buildRouteTable(PUBLIC_SUBNET, position, zone),
        buildRouteTableAssociation(PUBLIC_SUBNET, position),
        buildRoute(PUBLIC_SUBNET, position, {
          GatewayId: 'InternetGateway',
        }),
      );

      if (createDbSubnet) {
        // DB Subnet
        Object.assign(
          resources,
          buildSubnet(DB_SUBNET, position, zone, subnets.get(zone).get(DB_SUBNET)),
          buildRouteTable(DB_SUBNET, position, zone),
          buildRouteTableAssociation(DB_SUBNET, position),
        );
      }
    });

    if (createNetworkAcl) {
      // Add Network ACLs
      Object.assign(
        resources,
        buildPublicNetworkAcl(zones.length),
        buildAppNetworkAcl(zones.length),
      );
      if (createDbSubnet) {
        Object.assign(resources, buildDBNetworkAcl(subnets.get(APP_SUBNET)));
      }
    }

    return resources;
  }
}

module.exports = ServerlessVpcPlugin;

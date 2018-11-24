const CIDR = require('cidr-split');
const merge = require('lodash.merge');

const {
  DEFAULT_VPC_EIP_LIMIT, APP_SUBNET, PUBLIC_SUBNET, DB_SUBNET,
} = require('./constants');

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

const {
  buildAppNetworkAcl,
  buildPublicNetworkAcl,
  buildDBNetworkAcl,
} = require('./nacl');

const {
  buildRDSSubnetGroup,
  buildElastiCacheSubnetGroup,
  buildRedshiftSubnetGroup,
  buildDAXSubnetGroup,
} = require('./subnet_groups');

const {
  buildEndpointServices,
  buildLambdaVPCEndpointSecurityGroup,
} = require('./vpce');

const {
  buildEIP,
  buildNatGateway,
} = require('./natgw');


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
    let useNetworkAcl = false;
    let zones = [];
    let services = ['s3', 'dynamodb'];
    let skipDbCreation = false;

    const { vpcConfig } = this.serverless.service.custom;

    if (vpcConfig) {
      if (vpcConfig.cidrBlock && typeof vpcConfig.cidrBlock === 'string') {
        ({ cidrBlock } = vpcConfig);
      }
      if ('useNatGateway' in vpcConfig) {
        ({ useNatGateway } = vpcConfig);
      }
      if ('useNetworkAcl' in vpcConfig && typeof vpcConfig.useNetworkAcl === 'boolean') {
        ({ useNetworkAcl } = vpcConfig);
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
    const stage = this.provider.getStage();

    if (zones.length < 1) {
      this.serverless.cli.log(`Discovering available zones in ${region}...`);
      zones = await this.getZonesPerRegion(region);
    }
    const numZones = zones.length;

    if (useNatGateway) {
      if (typeof useNatGateway !== 'boolean' && typeof useNatGateway !== 'number') {
        throw new Error('useNatGateway must be either a boolean or a number');
      }
      if (numZones > DEFAULT_VPC_EIP_LIMIT) {
        this.serverless.cli.log(`WARNING: Number of zones (${numZones} is greater than default EIP limit (${DEFAULT_VPC_EIP_LIMIT}). Please ensure you requested an AWS EIP limit increase.`);
      }
      if (typeof useNatGateway === 'boolean') {
        useNatGateway = (useNatGateway) ? numZones : 0;
      } else if (useNatGateway > numZones) {
        useNatGateway = numZones;
      }
    }

    this.serverless.cli.log(`Generating a VPC in ${region} (${cidrBlock}) across ${numZones} availability zones: ${zones}`);

    merge(
      this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
      buildVpc(stage, { cidrBlock }),
      buildInternetGateway(stage),
      buildInternetGatewayAttachment(),
      ServerlessVpcPlugin.buildAvailabilityZones(stage, {
        cidrBlock, zones, numNatGateway: useNatGateway, skipDbCreation, useNetworkAcl,
      }),
      buildLambdaSecurityGroup(stage),
    );

    if (services.length > 0) {
      const invalid = await this.validateServices(region, services);
      if (invalid.length > 0) {
        throw new Error(`WARNING: Requested services are not available in ${region}: ${invalid.join(', ')}`);
      }
      this.serverless.cli.log(`Provisioning VPC endpoints for: ${services.join(', ')}`);

      merge(
        this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
        buildEndpointServices({ services, numZones }),
        buildLambdaVPCEndpointSecurityGroup(stage),
      );
    }

    if (!skipDbCreation) {
      if (numZones < 2) {
        this.serverless.cli.log('WARNING: less than 2 AZs; skipping subnet group provisioning');
      } else {
        merge(
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
          buildRDSSubnetGroup(stage, { numZones }),
          buildRedshiftSubnetGroup(stage, { numZones }),
          buildElastiCacheSubnetGroup({ numZones }),
          buildDAXSubnetGroup({ numZones }),
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
  static splitSubnets(cidrBlock, zones) {
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

      const azSubnets = CIDR.fromString(azCidrBlock).split().map(cidr => cidr.toString());
      subnets.push(azSubnets[0]); // Application subnet is a /21

      const smallerSubnets = CIDR.fromString(azSubnets[1]).split().map(cidr => cidr.toString());
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
   * 3.) Split the second /21 subnet into two /22 subnets: one Public subnet (for load balancers),
   *     and one for databases (RDS, ElastiCache, and Redshift)
   *
   * @param {String} stage Serverless Stage
   * @param {String} cidrBlock VPC CIDR Block
   * @param {Array} zones Array of availability zones
   * @param {Number} numNatGateway Number of NAT gateways (and EIPs) to provision
   * @param {Boolean} skipDbCreation Whether to skip creating the DBSubnet or not
   * @param {Boolean} useNetworkAcl Whether to create Network ACLs or not
   * @return {Object}
   */
  static buildAvailabilityZones(stage, {
    cidrBlock,
    zones = [],
    numNatGateway = 0,
    skipDbCreation = false,
    useNetworkAcl = false,
  } = {}) {
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
        merge(
          resources,
          buildEIP(index + 1),
          buildNatGateway(stage, index + 1, zones[index]),
        );
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

      merge(
        resources,

        // App Subnet
        buildSubnet(stage, APP_SUBNET, position, zone, subnets.get(zone).get(APP_SUBNET)),
        buildRouteTable(stage, APP_SUBNET, position, zone),
        buildRouteTableAssociation(APP_SUBNET, position),
        buildRoute(APP_SUBNET, position, params),

        // Public Subnet
        buildSubnet(stage, PUBLIC_SUBNET, position, zone, subnets.get(zone).get(PUBLIC_SUBNET)),
        buildRouteTable(stage, PUBLIC_SUBNET, position, zone),
        buildRouteTableAssociation(PUBLIC_SUBNET, position),
        buildRoute(PUBLIC_SUBNET, position, {
          GatewayId: 'InternetGateway',
        }),
      );

      if (!skipDbCreation) {
        // DB Subnet
        merge(
          resources,
          buildSubnet(stage, DB_SUBNET, position, zone, subnets.get(zone).get(DB_SUBNET)),
          buildRouteTable(stage, DB_SUBNET, position, zone),
          buildRouteTableAssociation(DB_SUBNET, position),
        );
      }
    });

    if (useNetworkAcl) {
      // Add Network ACLs
      merge(
        resources,
        buildPublicNetworkAcl(stage, zones.length),
        buildAppNetworkAcl(stage, zones.length),
      );
      if (!skipDbCreation) {
        merge(resources, buildDBNetworkAcl(stage, subnets.get(APP_SUBNET)));
      }
    }

    return resources;
  }
}

module.exports = ServerlessVpcPlugin;

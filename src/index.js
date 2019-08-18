const { DEFAULT_VPC_EIP_LIMIT, APP_SUBNET, VALID_SUBNET_GROUPS } = require('./constants');
const { splitSubnets } = require('./subnets');
const { buildAvailabilityZones } = require('./az');
const {
  buildVpc,
  buildInternetGateway,
  buildInternetGatewayAttachment,
  buildLambdaSecurityGroup,
} = require('./vpc');
const { buildAppNetworkAcl, buildPublicNetworkAcl, buildDBNetworkAcl } = require('./nacl');
const { buildSubnetGroups } = require('./subnet_groups');
const { buildEndpointServices, buildLambdaVPCEndpointSecurityGroup } = require('./vpce');
const { buildLogBucket, buildLogBucketPolicy, buildVpcFlowLogs } = require('./flow_logs');
const { buildBastion } = require('./bastion');
const { buildNatInstance, buildNatSecurityGroup } = require('./nat_instance');
const { buildOutputs } = require('./outputs');

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
    let createNatInstance = false;
    let createBastionHost = false;
    let bastionHostKeyName = null;
    let exportOutputs = false;
    let subnetGroups = VALID_SUBNET_GROUPS;

    const { vpcConfig } = this.serverless.service.custom;

    if (vpcConfig) {
      if (vpcConfig.cidrBlock && typeof vpcConfig.cidrBlock === 'string') {
        ({ cidrBlock } = vpcConfig);
      }

      if ('createNatGateway' in vpcConfig) {
        ({ createNatGateway } = vpcConfig);
      } else if ('useNatGateway' in vpcConfig) {
        this.serverless.cli.log(
          'WARNING: useNatGateway has been deprecated, please use createNatGateway',
        );
        createNatGateway = vpcConfig.useNatGateway;
      }

      if ('createNetworkAcl' in vpcConfig && typeof vpcConfig.createNetworkAcl === 'boolean') {
        ({ createNetworkAcl } = vpcConfig);
      } else if ('useNetworkAcl' in vpcConfig && typeof vpcConfig.useNetworkAcl === 'boolean') {
        this.serverless.cli.log(
          'WARNING: useNetworkAcl has been deprecated, please use createNetworkAcl',
        );
        createNetworkAcl = vpcConfig.useNetworkAcl;
      }

      if (Array.isArray(vpcConfig.zones) && vpcConfig.zones.length > 0) {
        zones = vpcConfig.zones.map(z => z.trim().toLowerCase());
      }
      if (Array.isArray(vpcConfig.services)) {
        services = vpcConfig.services.map(s => s.trim().toLowerCase());
      }
      if (Array.isArray(vpcConfig.subnetGroups)) {
        subnetGroups = vpcConfig.subnetGroups.map(s => s.trim().toLowerCase());
      }

      if ('createDbSubnet' in vpcConfig && typeof vpcConfig.createDbSubnet === 'boolean') {
        ({ createDbSubnet } = vpcConfig);
      } else if ('skipDbCreation' in vpcConfig && typeof vpcConfig.skipDbCreation === 'boolean') {
        this.serverless.cli.log(
          'WARNING: skipDbCreation has been deprecated, please use createDbSubnet',
        );
        createDbSubnet = !vpcConfig.skipDbCreation;
      }

      if ('createFlowLogs' in vpcConfig && typeof vpcConfig.createFlowLogs === 'boolean') {
        ({ createFlowLogs } = vpcConfig);
      }

      if ('createBastionHost' in vpcConfig && typeof vpcConfig.createBastionHost === 'boolean') {
        ({ createBastionHost } = vpcConfig);
      }

      if ('bastionHostKeyName' in vpcConfig && typeof vpcConfig.bastionHostKeyName === 'string') {
        ({ bastionHostKeyName } = vpcConfig);
      }

      if (createBastionHost && (!bastionHostKeyName || bastionHostKeyName.length < 1)) {
        throw new this.serverless.classes.Error(
          'bastionHostKeyName must be provided if createBastionHost is true',
        );
      }

      if ('createNatInstance' in vpcConfig && typeof vpcConfig.createNatInstance === 'boolean') {
        ({ createNatInstance } = vpcConfig);
      }

      if ('exportOutputs' in vpcConfig && typeof vpcConfig.exportOutputs === 'boolean') {
        ({ exportOutputs } = vpcConfig);
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
          `WARNING: Number of NAT gateways (${createNatGateway}) is greater than default ` +
            `EIP limit (${DEFAULT_VPC_EIP_LIMIT}). Please ensure you requested ` +
            `an AWS EIP limit increase.`,
        );
      }
    }

    this.serverless.cli.log(
      `Generating a VPC in ${region} (${cidrBlock}) across ${numZones} AZs: ${zones}`,
    );

    const providerObj = this.serverless.service.provider;
    const resources = providerObj.compiledCloudFormationTemplate.Resources;

    let vpcNatAmi = null;
    if (createNatInstance) {
      this.serverless.cli.log('Finding latest VPC NAT Instance AMI...');

      const images = await this.getImagesByName('amzn-ami-vpc-nat-hvm*');
      if (Array.isArray(images) && images.length > 0) {
        [vpcNatAmi] = images;
      } else {
        throw new this.serverless.classes.Error(
          `Could not find an available VPC NAT Instance AMI in ${region}`,
        );
      }
    }

    const subnets = splitSubnets(cidrBlock, zones);

    Object.assign(
      resources,
      buildVpc(cidrBlock),
      buildInternetGateway(),
      buildInternetGatewayAttachment(),
      buildAvailabilityZones(subnets, zones, {
        numNatGateway: createNatGateway,
        createDbSubnet,
        createNatInstance: !!(createNatInstance && vpcNatAmi),
      }),
      buildLambdaSecurityGroup(),
    );

    if (createNetworkAcl) {
      this.serverless.cli.log('Provisioning Network ACLs');
      Object.assign(
        resources,
        buildPublicNetworkAcl(zones.length),
        buildAppNetworkAcl(zones.length),
      );
      if (createDbSubnet) {
        Object.assign(resources, buildDBNetworkAcl(subnets.get(APP_SUBNET)));
      }
    }

    if (createNatInstance && vpcNatAmi) {
      this.serverless.cli.log(`Provisioning NAT Instance using AMI ${vpcNatAmi}`);
      Object.assign(
        resources,
        buildNatSecurityGroup(subnets.get(APP_SUBNET)),
        buildNatInstance(vpcNatAmi, zones),
      );
    }

    if (createBastionHost) {
      this.serverless.cli.log(`Provisioning bastion host using key pair "${bastionHostKeyName}"`);

      // @see https://aws.amazon.com/blogs/compute/query-for-the-latest-amazon-linux-ami-ids-using-aws-systems-manager-parameter-store/
      providerObj.compiledCloudFormationTemplate.Parameters = {
        LatestAmiId: {
          Type: 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
          Default: '/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2',
        },
      };

      Object.assign(resources, await buildBastion(bastionHostKeyName, zones.length));
    }

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
        buildEndpointServices(services, numZones),
        buildLambdaVPCEndpointSecurityGroup(),
      );
    }

    if (createDbSubnet) {
      if (numZones < 2) {
        this.serverless.cli.log('WARNING: less than 2 AZs; skipping subnet group provisioning');
      } else {
        const invalidGroup = subnetGroups.some(group => !VALID_SUBNET_GROUPS.includes(group));
        if (invalidGroup) {
          throw new this.serverless.classes.Error(
            'WARNING: Invalid subnetGroups option. Valid options: rds, redshift, elasticache, dax',
          );
        }
        Object.assign(resources, buildSubnetGroups(numZones, subnetGroups));
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

    const outputs = providerObj.compiledCloudFormationTemplate.Outputs;
    Object.assign(
      outputs,
      buildOutputs(createBastionHost, subnetGroups, vpc.subnetIds, exportOutputs),
    );

    this.serverless.service.provider.vpc = vpc;
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
   * Return an array of AMI images which match the VPC NAT Instance image
   *
   * @param {String} name AMI name to search for
   * @return {Array}
   */
  async getImagesByName(name) {
    const params = {
      Owners: ['amazon'],
      Filters: [
        {
          Name: 'architecture',
          Values: ['x86_64'],
        },
        {
          Name: 'image-type',
          Values: ['machine'],
        },
        {
          Name: 'is-public',
          Values: ['true'],
        },
        {
          Name: 'name',
          Values: [name],
        },
        {
          Name: 'state',
          Values: ['available'],
        },
        {
          Name: 'root-device-type',
          Values: ['ebs'],
        },
        {
          Name: 'virtualization-type',
          Values: ['hvm'],
        },
      ],
    };
    return this.provider.request('EC2', 'describeImages', params).then(data =>
      data.Images.sort((a, b) => {
        if (a.CreationDate > b.CreationDate) {
          return -1;
        }
        if (a.CreationDate < b.CreationDate) {
          return 1;
        }
        return 0;
      }).map(image => image.ImageId),
    );
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
}

module.exports = ServerlessVpcPlugin;

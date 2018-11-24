const AWS = require('aws-sdk-mock');

const Serverless = require('serverless');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');
const ServerlessVpcPlugin = require('../src/index');

// fixtures
const vpcSingleAZNatGWDB = require('./fixtures/vpc_single_az_natgw_db.json');
const vpcSingleAZNoGatGWDB = require('./fixtures/vpc_single_az_no_natgw_db.json');
const vpcSingleAZNatGWNoDB = require('./fixtures/vpc_single_az_natgw_no_db.json');
const vpcSingleAZNoGatGWNoDB = require('./fixtures/vpc_single_az_no_natgw_no_db.json');
const vpcSingleAZNoNatGWNoDBNACL = require('./fixtures/vpc_single_az_no_natgw_no_db_nacl.json');

const vpcMultipleAZNatGWDB = require('./fixtures/vpc_multiple_az_natgw_db.json');
const vpcMultipleAZNoNatGWDB = require('./fixtures/vpc_multiple_az_no_natgw_db.json');
const vpcMultipleAZNatGWNoDB = require('./fixtures/vpc_multiple_az_natgw_no_db.json');
const vpcMultipleAZNoNatGWNoDB = require('./fixtures/vpc_multiple_az_no_natgw_no_db.json');

const vpcMultipleAZSingleNatGWNoDB = require('./fixtures/vpc_multiple_az_single_natgw_no_db.json');
const vpcMultipleAZMultipleNatGWNoDB = require('./fixtures/vpc_multiple_az_multiple_natgw_no_db.json');

describe('ServerlessVpcPlugin', () => {
  let serverless;
  let plugin;

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    serverless = new Serverless(options);
    const provider = new AwsProvider(serverless, options);
    serverless.setProvider('aws', provider);
    serverless.service.provider = { name: 'aws', stage: 'dev' };

    plugin = new ServerlessVpcPlugin(serverless);
  });

  afterEach(() => {
    AWS.restore();
  });

  describe('#constructor', () => {
    it('should initialize without options', () => {
      expect(plugin.serverless).toBeInstanceOf(Serverless);
      expect(plugin.options).toEqual({});
      expect.assertions(2);
    });

    it('should initialize with empty options', () => {
      plugin = new ServerlessVpcPlugin(serverless, {});
      expect(plugin.serverless).toBeInstanceOf(Serverless);
      expect(plugin.options).toEqual({});
      expect.assertions(2);
    });

    it('should initialize with custom options', () => {
      const options = {
        zones: ['us-west-2'],
      };
      plugin = new ServerlessVpcPlugin(serverless, options);
      expect(plugin.serverless).toBeInstanceOf(Serverless);
      expect(plugin.options).toEqual(options);
      expect.assertions(2);
    });

    it('should be added as a serverless plugin', () => {
      serverless.pluginManager.addPlugin(ServerlessVpcPlugin);
      expect(serverless.pluginManager.plugins[0]).toBeInstanceOf(ServerlessVpcPlugin);
      expect.assertions(1);
    });
  });

  describe.skip('#getZonesPerRegion', () => {
    it('returns the zones in a region', async () => {
      const mockCallback = jest.fn((params, callback) => {
        expect(params.Filters[0].Values[0]).toEqual('us-east-1');
        const data = {
          AvailabilityZones: [
            {
              State: 'available',
              ZoneName: 'us-east-1b',
            },
            {
              State: 'unavailable',
              ZoneName: 'us-east-1c',
            },
            {
              State: 'available',
              ZoneName: 'us-east-1a',
            },
          ],
        };
        return callback(null, data);
      });

      AWS.mock('EC2', 'describeAvailabilityZones', mockCallback);

      const actual = await plugin.getZonesPerRegion('us-east-1');

      const expected = ['us-east-1a', 'us-east-1b'];

      expect(mockCallback).toHaveBeenCalled();
      expect(actual).toEqual(expected);
      expect.assertions(3);
    });
  });

  describe.skip('#getVpcEndpointServicesPerRegion', () => {
    it('returns the endpoint services in a region', async () => {
      const mockCallback = jest.fn((params, callback) => {
        const data = {
          ServiceNames: [
            'com.amazonaws.us-east-1.dynamodb',
            'com.amazonaws.us-east-1.s3',
            'com.amazonaws.us-east-1.kms',
            'com.amazonaws.us-east-1.kinesis-streams',
          ],
        };
        return callback(null, data);
      });

      AWS.mock('EC2', 'describeVpcEndpointServices', mockCallback);

      const actual = await plugin.getVpcEndpointServicesPerRegion('us-east-1');

      const expected = ['dynamodb', 'kinesis-streams', 'kms', 's3'];

      expect(mockCallback).toHaveBeenCalled();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#splitVpc', () => {
    it('splits 10.0.0.0/16 into 16 /20s', () => {
      const actual = ServerlessVpcPlugin.splitVpc('10.0.0.0/16').map(cidr => cidr.toString());
      const expected = [
        '10.0.0.0/20',
        '10.0.16.0/20',
        '10.0.32.0/20',
        '10.0.48.0/20',
        '10.0.64.0/20',
        '10.0.80.0/20',
        '10.0.96.0/20',
        '10.0.112.0/20',
        '10.0.128.0/20',
        '10.0.144.0/20',
        '10.0.160.0/20',
        '10.0.176.0/20',
        '10.0.192.0/20',
        '10.0.208.0/20',
        '10.0.224.0/20',
        '10.0.240.0/20',
      ];

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('splits 192.168.0.0/16 into 16 /20s', () => {
      const actual = ServerlessVpcPlugin.splitVpc('192.168.0.0/16').map(cidr => cidr.toString());
      const expected = [
        '192.168.0.0/20',
        '192.168.16.0/20',
        '192.168.32.0/20',
        '192.168.48.0/20',
        '192.168.64.0/20',
        '192.168.80.0/20',
        '192.168.96.0/20',
        '192.168.112.0/20',
        '192.168.128.0/20',
        '192.168.144.0/20',
        '192.168.160.0/20',
        '192.168.176.0/20',
        '192.168.192.0/20',
        '192.168.208.0/20',
        '192.168.224.0/20',
        '192.168.240.0/20',
      ];

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#splitSubnets', () => {
    it('splits 10.0.0.0/16 separate subnets in each AZ', () => {
      const zones = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
      const actual = ServerlessVpcPlugin.splitSubnets('10.0.0.0/16', zones);

      const parts = [
        ['us-east-1a', new Map([
          ['App', '10.0.0.0/21'],
          ['Public', '10.0.8.0/22'],
          ['DB', '10.0.12.0/22']]),
        ],
        ['us-east-1b', new Map([
          ['App', '10.0.16.0/21'],
          ['Public', '10.0.24.0/22'],
          ['DB', '10.0.28.0/22']]),
        ],
        ['us-east-1c', new Map([
          ['App', '10.0.32.0/21'],
          ['Public', '10.0.40.0/22'],
          ['DB', '10.0.44.0/22']]),
        ],
        ['App', ['10.0.0.0/21', '10.0.16.0/21', '10.0.32.0/21']],
        ['Public', ['10.0.8.0/22', '10.0.24.0/22', '10.0.40.0/22']],
        ['DB', ['10.0.12.0/22', '10.0.28.0/22', '10.0.44.0/22']],
      ];

      const expected = new Map(parts);

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildAvailabilityZones', () => {
    it('builds no AZs without options', () => {
      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16');
      expect(actual).toEqual({});
      expect.assertions(1);
    });

    it('builds a single AZ with a NAT Gateway and DBSubnet', () => {
      const expected = Object.assign({}, vpcSingleAZNatGWDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a'],
        numNatGateway: 1,
        skipDbCreation: false,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ without a NAT Gateway and DBSubnet', () => {
      const expected = Object.assign({}, vpcSingleAZNoGatGWDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a'],
        numNatGateway: 0,
        skipDbCreation: false,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ with a NAT Gateway and no DBSubnet', () => {
      const expected = Object.assign({}, vpcSingleAZNatGWNoDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a'],
        numNatGateway: 1,
        skipDbCreation: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ without a NAT Gateway and no DBSubnet', () => {
      const expected = Object.assign({}, vpcSingleAZNoGatGWNoDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a'],
        numNatGateway: 0,
        skipDbCreation: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a NAT Gateway and DBSubnet', () => {
      const expected = Object.assign({}, vpcMultipleAZNatGWDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a', 'us-east-1b'],
        numNatGateway: 2,
        skipDbCreation: false,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs without a NAT Gateway and DBSubnet', () => {
      const expected = Object.assign({}, vpcMultipleAZNoNatGWDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a', 'us-east-1b'],
        numNatGateway: 0,
        skipDbCreation: false,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a NAT Gateway and no DBSubnet', () => {
      const expected = Object.assign({}, vpcMultipleAZNatGWNoDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a', 'us-east-1b'],
        numNatGateway: 2,
        skipDbCreation: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs without a NAT Gateway and no DBSubnet', () => {
      const expected = Object.assign({}, vpcMultipleAZNoNatGWNoDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a', 'us-east-1b'],
        numNatGateway: 0,
        skipDbCreation: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a single NAT Gateway and no DBSubnet', () => {
      const expected = Object.assign({}, vpcMultipleAZSingleNatGWNoDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a', 'us-east-1b'],
        numNatGateway: 1,
        skipDbCreation: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a multple NAT Gateways and no DBSubnet', () => {
      const expected = Object.assign({}, vpcMultipleAZMultipleNatGWNoDB);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
        numNatGateway: 2,
        skipDbCreation: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ without a NAT Gateway and no DBSubnet and NACL', () => {
      const expected = Object.assign({}, vpcSingleAZNoNatGWNoDBNACL);

      const actual = ServerlessVpcPlugin.buildAvailabilityZones('dev', '10.0.0.0/16', {
        zones: ['us-east-1a'],
        numNatGateway: 0,
        skipDbCreation: true,
        useNetworkAcl: true,
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

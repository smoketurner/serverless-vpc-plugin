const AWS = require('aws-sdk-mock');

const Serverless = require('serverless');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');
const ServerlessVpcPlugin = require('../src/index');

describe('ServerlessVpcPlugin', () => {
  let serverless;
  let plugin;

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    serverless = new Serverless(options);
    serverless.init();

    const provider = new AwsProvider(serverless, options);
    AWS.setSDKInstance(provider.sdk);
    serverless.setProvider('aws', provider);

    provider.cachedCredentials = {
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    };

    serverless.service.provider = {
      name: 'aws',
      stage: 'dev',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      compiledCloudFormationTemplate: {
        Resources: {},
        Outputs: {},
        Parameters: {},
      },
    };

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
      const newPlugin = new ServerlessVpcPlugin(serverless, {});
      expect(newPlugin.serverless).toBeInstanceOf(Serverless);
      expect(newPlugin.options).toEqual({});
      expect.assertions(2);
    });

    it('should initialize with custom options', () => {
      const options = {
        zones: ['us-west-2a'],
        services: [],
      };
      const newPlugin = new ServerlessVpcPlugin(serverless, options);
      expect(newPlugin.serverless).toBeInstanceOf(Serverless);
      expect(newPlugin.options).toEqual(options);
      expect.assertions(2);
    });

    it('should be added as a serverless plugin', () => {
      serverless.pluginManager.addPlugin(ServerlessVpcPlugin);
      expect(serverless.pluginManager.plugins[0]).toBeInstanceOf(ServerlessVpcPlugin);
      expect.assertions(1);
    });
  });

  describe('#afterInitialize', () => {
    it('should require a bastion key name', async () => {
      serverless.service.custom.vpcConfig = {
        createBastionHost: true,
        services: [],
      };

      await expect(plugin.afterInitialize()).rejects.toThrow(
        'bastionHostKeyName must be provided if createBastionHost is true',
      );
      expect.assertions(1);
    });

    it('createNatGateway should be either boolean or a number', async () => {
      serverless.service.custom.vpcConfig = {
        createNatGateway: 'hello',
        zones: ['us-east-1a'],
        services: [],
      };

      await expect(plugin.afterInitialize()).rejects.toThrow(
        'createNatGateway must be either a boolean or a number',
      );
      expect.assertions(1);
    });

    it('should discover available zones', async () => {
      const mockCallback = jest.fn((params, callback) => {
        expect(params.Filters[0].Values[0]).toEqual('us-east-1');
        const response = {
          AvailabilityZones: [
            {
              State: 'available',
              ZoneName: 'us-east-1a',
            },
          ],
        };
        return callback(null, response);
      });

      AWS.mock('EC2', 'describeAvailabilityZones', mockCallback);

      serverless.service.custom.vpcConfig = {
        services: [],
      };

      const actual = await plugin.afterInitialize();
      expect(actual).toBeUndefined();
      expect(mockCallback).toHaveBeenCalled();
      expect.assertions(3);
    });

    it('rejects invalid subnet groups', async () => {
      serverless.service.custom.vpcConfig = {
        zones: ['us-east-1a', 'us-east-1b'],
        subnetGroups: ['invalid'],
        services: [],
      };

      await expect(plugin.afterInitialize()).rejects.toThrow(
        'WARNING: Invalid subnetGroups option. Valid options: rds, redshift, elasticache, dax',
      );
      expect.assertions(1);
    });
  });

  describe('#getZonesPerRegion', () => {
    it('returns the zones in a region', async () => {
      const mockCallback = jest.fn((params, callback) => {
        expect(params.Filters[0].Values[0]).toEqual('us-east-1');
        const response = {
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
        return callback(null, response);
      });

      AWS.mock('EC2', 'describeAvailabilityZones', mockCallback);

      const actual = await plugin.getZonesPerRegion('us-east-1');

      const expected = ['us-east-1a', 'us-east-1b'];

      expect(mockCallback).toHaveBeenCalled();
      expect(actual).toEqual(expected);
      expect.assertions(3);
    });
  });

  describe('#getVpcEndpointServicesPerRegion', () => {
    it('returns the endpoint services in a region', async () => {
      const mockCallback = jest.fn((params, callback) => {
        const response = {
          ServiceNames: [
            'com.amazonaws.us-east-1.dynamodb',
            'com.amazonaws.us-east-1.s3',
            'com.amazonaws.us-east-1.kms',
            'com.amazonaws.us-east-1.kinesis-streams',
          ],
        };
        return callback(null, response);
      });

      AWS.mock('EC2', 'describeVpcEndpointServices', mockCallback);

      const actual = await plugin.getVpcEndpointServicesPerRegion('us-east-1');

      const expected = [
        'com.amazonaws.us-east-1.dynamodb',
        'com.amazonaws.us-east-1.kinesis-streams',
        'com.amazonaws.us-east-1.kms',
        'com.amazonaws.us-east-1.s3',
      ];

      expect(mockCallback).toHaveBeenCalled();
      expect(actual).toEqual(expected);
      expect.assertions(2);
    });
  });

  describe('#getImagesByName', () => {
    it('returns an AMI image by name', async () => {
      const mockCallback = jest.fn((params, callback) => {
        expect(params.Filters.find(f => f.Name === 'name').Values).toEqual(['test']);
        const response = {
          Images: [
            {
              ImageId: 'ami-test',
              CreationDate: '2019-04-12T00:00:00Z',
            },
          ],
        };
        return callback(null, response);
      });

      AWS.mock('EC2', 'describeImages', mockCallback);

      const actual = await plugin.getImagesByName('test');
      expect(actual).toEqual(['ami-test']);
      expect(mockCallback).toHaveBeenCalled();
      expect.assertions(3);
    });
  });

  describe('#validateServices', () => {
    it('returns validated services', async () => {
      const mockCallback = jest.fn((params, callback) => {
        const response = {
          ServiceNames: [
            'com.amazonaws.us-east-1.dynamodb',
            'com.amazonaws.us-east-1.s3',
            'com.amazonaws.us-east-1.kms',
            'com.amazonaws.us-east-1.kinesis-streams',
          ],
        };
        return callback(null, response);
      });

      AWS.mock('EC2', 'describeVpcEndpointServices', mockCallback);

      const actual = await plugin.validateServices('us-east-1', ['blah']);
      expect(actual).toEqual(['com.amazonaws.us-east-1.blah']);
      expect(mockCallback).toHaveBeenCalled();
      expect.assertions(2);
    });
  });
});

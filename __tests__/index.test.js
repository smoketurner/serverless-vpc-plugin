const AWS = require('aws-sdk-mock');
const AWS_SDK = require('aws-sdk');

AWS.setSDKInstance(AWS_SDK);

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
});

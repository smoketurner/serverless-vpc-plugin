const AWS = require('aws-sdk-mock');
const AWS_SDK = require('aws-sdk');

AWS.setSDKInstance(AWS_SDK);

const Serverless = require('serverless');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');
const ServerlessVpcPlugin = require('../src/index');

// fixtures
const vpcSingleAZNatGW = require('./fixtures/vpc_single_az_natgw.json');

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
    provider.sdk = AWS_SDK;

    serverless.setProvider('aws', provider);
    serverless.service.provider = { name: 'aws', stage: 'dev' };
    serverless.service.service = 'test';
    serverless.processedInput = { options: {} };
    serverless.cli = { log: () => {} };

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
            'dynamodb',
            's3',
            'kms',
            'kinesis',
          ],
        };
        return callback(null, data);
      });

      AWS.mock('EC2', 'describeVpcEndpointServices', mockCallback);

      const actual = await plugin.getVpcEndpointServicesPerRegion('us-east-1');

      const expected = ['dynamodb', 'kinesis', 'kms', 's3'];

      expect(mockCallback).toHaveBeenCalled();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildVpc', () => {
    it('builds a VPC with default name', () => {
      const expected = {
        VPC: {
          Type: 'AWS::EC2::VPC',
          Properties: {
            CidrBlock: '10.0.0.0/16',
            EnableDnsSupport: true,
            EnableDnsHostnames: true,
            InstanceTenancy: 'default',
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
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

      const actual = plugin.buildVpc();
      expect(actual).toEqual(expected);
    });

    it('builds a VPC with a custom parameters', () => {
      const expected = {
        MyVpc: {
          Type: 'AWS::EC2::VPC',
          Properties: {
            CidrBlock: '192.168.0.0/16',
            EnableDnsSupport: true,
            EnableDnsHostnames: true,
            InstanceTenancy: 'default',
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
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

      const actual = plugin.buildVpc({ name: 'MyVpc', cidrBlock: '192.168.0.0/16' });
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildInternetGateway', () => {
    it('builds an Internet Gateway with default name', () => {
      const expected = {
        InternetGateway: {
          Type: 'AWS::EC2::InternetGateway',
          Properties: {
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
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

      const actual = plugin.buildInternetGateway();

      expect(actual).toEqual(expected);
    });

    it('builds an Internet Gateway with a custom name', () => {
      const expected = {
        MyInternetGateway: {
          Type: 'AWS::EC2::InternetGateway',
          Properties: {
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
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

      const actual = plugin.buildInternetGateway({ name: 'MyInternetGateway' });

      expect(actual).toEqual(expected);
    });
  });

  describe('#buildInternetGatewayAttachment', () => {
    it('builds an Internet Gateway Attachment with default name', () => {
      const expected = {
        InternetGatewayAttachment: {
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

      const actual = ServerlessVpcPlugin.buildInternetGatewayAttachment();

      expect(actual).toEqual(expected);
    });

    it('builds an Internet Gateway Attachment with a custom name', () => {
      const expected = {
        MyInternetGatewayAttachment: {
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

      const actual = ServerlessVpcPlugin.buildInternetGatewayAttachment({
        name: 'MyInternetGatewayAttachment',
      });

      expect(actual).toEqual(expected);
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
    });
  });

  describe('#buildAvailabilityZones', () => {
    it('builds no AZs without options', () => {
      const actual = plugin.buildAvailabilityZones({ cidrBlock: '10.0.0.0/16' });
      expect(actual).toEqual({});
    });

    it('builds a single AZ', () => {
      const expected = Object.assign({}, vpcSingleAZNatGW);

      const actual = plugin.buildAvailabilityZones({
        cidrBlock: '10.0.0.0/16',
        zones: ['us-east-1a'],
      });
      expect(actual).toEqual(expected);
    });
  });
});

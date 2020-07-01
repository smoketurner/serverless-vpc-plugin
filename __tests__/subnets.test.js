const { splitVpc, splitSubnets, buildSubnet } = require('../src/subnets');

describe('subnets', () => {
  describe('#splitVpc', () => {
    it('splits 10.0.0.0/16 into 16 /20s', () => {
      const actual = splitVpc('10.0.0.0/16').map((cidr) => cidr.toString());
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
      const actual = splitVpc('192.168.0.0/16').map((cidr) => cidr.toString());
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
      const actual = splitSubnets('10.0.0.0/16', zones);

      const parts = [
        [
          'us-east-1a',
          new Map([
            ['App', '10.0.0.0/21'],
            ['Public', '10.0.8.0/22'],
            ['DB', '10.0.12.0/22'],
          ]),
        ],
        [
          'us-east-1b',
          new Map([
            ['App', '10.0.16.0/21'],
            ['Public', '10.0.24.0/22'],
            ['DB', '10.0.28.0/22'],
          ]),
        ],
        [
          'us-east-1c',
          new Map([
            ['App', '10.0.32.0/21'],
            ['Public', '10.0.40.0/22'],
            ['DB', '10.0.44.0/22'],
          ]),
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

  describe('#buildSubnet', () => {
    it('builds a subnet', () => {
      const expected = {
        AppSubnet1: {
          Type: 'AWS::EC2::Subnet',
          Properties: {
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.0.0/22',
            Tags: [
              {
                Key: 'Name',
                Value: {
                  // eslint-disable-next-line no-template-curly-in-string
                  'Fn::Sub': '${AWS::StackName}-app-us-east-1a',
                },
              },
              {
                Key: 'Network',
                Value: 'Private',
              },
            ],
            VpcId: {
              Ref: 'VPC',
            },
          },
        },
      };
      const actual = buildSubnet('App', 1, 'us-east-1a', '10.0.0.0/22');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

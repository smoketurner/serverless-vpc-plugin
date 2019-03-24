const { buildEIP, buildNatGateway } = require('../src/natgw');

describe('natgw', () => {
  describe('#buildEIP', () => {
    it('builds an EIP', () => {
      const expected = {
        EIP1: {
          Type: 'AWS::EC2::EIP',
          Properties: {
            Domain: 'vpc',
          },
        },
      };
      const actual = buildEIP(1);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildNatGateway', () => {
    it('builds a NAT Gateway', () => {
      const expected = {
        NatGateway1: {
          Type: 'AWS::EC2::NatGateway',
          Properties: {
            AllocationId: {
              'Fn::GetAtt': ['EIP1', 'AllocationId'],
            },
            SubnetId: {
              Ref: 'PublicSubnet1',
            },
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
                      'us-east-1a',
                    ],
                  ],
                },
              },
            ],
          },
        },
      };
      const actual = buildNatGateway(1, 'us-east-1a');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

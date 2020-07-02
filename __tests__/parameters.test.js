const { buildParameter } = require('../src/parameters');

describe('parameters', () => {
  describe('#buildParameter', () => {
    it('builds an SSM String parameter', () => {
      const expected = {
        ParameterVPC: {
          Type: 'AWS::SSM::Parameter',
          Properties: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '/SLS/${AWS::StackName}/VPC',
            },
            Tier: 'Standard',
            Type: 'String',
            Value: {
              Ref: 'VPC',
            },
          },
        },
      };

      const actual = buildParameter('VPC');
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds an SSM StringList parameter', () => {
      const expected = {
        ParameterAppSubnets: {
          Type: 'AWS::SSM::Parameter',
          Properties: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '/SLS/${AWS::StackName}/AppSubnets',
            },
            Tier: 'Standard',
            Type: 'StringList',
            Value: {
              'Fn::Join': [',', [{ Ref: 'sg-1' }, { Ref: 'sg-2' }]],
            },
          },
        },
      };

      const actual = buildParameter('AppSubnets', { Value: [{ Ref: 'sg-1' }, { Ref: 'sg-2' }] });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

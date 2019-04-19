const { buildOutputs } = require('../src/outputs');

describe('outputs', () => {
  describe('#buildOutputs', () => {
    it('builds the outputs with no bastion host', () => {
      const expected = {
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
          },
        },
      };

      const actual = buildOutputs();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds the outputs with a bastion host', () => {
      const expected = {
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
          },
        },
        BastionSSHUser: {
          Description: 'SSH username for the Bastion host',
          Value: 'ec2-user',
        },
        BastionEIP: {
          Description: 'Public IP of Bastion host',
          Value: {
            Ref: 'BastionEIP',
          },
        },
      };

      const actual = buildOutputs(true);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

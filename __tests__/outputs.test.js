const { buildOutputs } = require('../src/outputs');

describe('outputs', () => {
  describe('#buildOutputs', () => {
    it('builds the outputs with no bastion host', () => {
      const expected = {
        DAXSubnetGroup: {
          Description: 'Subnet Group for dax',
          Value: ['DAXSubnetGroup'],
        },
        ElastiCacheSubnetGroup: {
          Description: 'Subnet Group for redshift',
          Value: ['ElastiCacheSubnetGroup'],
        },
        LambdaExecutionSecurityGroupId: {
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Value: ['RDSSubnetGroup'],
        },
        RedshiftSubnetGroup: {
          Description: 'Subnet Group for elasticache',
          Value: ['RedshiftSubnetGroup'],
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs();
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds the outputs with a bastion host', () => {
      const expected = {
        BastionEIP: {
          Description: 'Public IP of Bastion host',
          Value: {
            Ref: 'BastionEIP',
          },
        },
        BastionSSHUser: {
          Description: 'SSH username for the Bastion host',
          Value: 'ec2-user',
        },
        DAXSubnetGroup: {
          Description: 'Subnet Group for dax',
          Value: ['DAXSubnetGroup'],
        },
        ElastiCacheSubnetGroup: {
          Description: 'Subnet Group for redshift',
          Value: ['ElastiCacheSubnetGroup'],
        },
        LambdaExecutionSecurityGroupId: {
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Value: ['RDSSubnetGroup'],
        },
        RedshiftSubnetGroup: {
          Description: 'Subnet Group for elasticache',
          Value: ['RedshiftSubnetGroup'],
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs(true);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

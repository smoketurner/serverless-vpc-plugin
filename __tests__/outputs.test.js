const { VALID_SUBNET_GROUPS } = require('../src/constants');
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

    it('exports the stack output', () => {
      const expected = {
        DAXSubnetGroup: {
          Description: 'Subnet Group for dax',
          Export: {
            Name: {
              'Fn::Join': ['-', ["Fn::Ref 'AWS::StackName'", 'DAXSubnetGroup']],
            },
          },
          Value: ['DAXSubnetGroup'],
        },
        ElastiCacheSubnetGroup: {
          Description: 'Subnet Group for redshift',
          Export: {
            Name: {
              'Fn::Join': ['-', ["Fn::Ref 'AWS::StackName'", 'ElastiCacheSubnetGroup']],
            },
          },
          Value: ['ElastiCacheSubnetGroup'],
        },
        LambdaExecutionSecurityGroupId: {
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Export: {
            Name: {
              'Fn::Join': ['-', ["Fn::Ref 'AWS::StackName'", 'LambdaExecutionSecurityGroupId']],
            },
          },
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Export: {
            Name: {
              'Fn::Join': ['-', ["Fn::Ref 'AWS::StackName'", 'RDSSubnetGroup']],
            },
          },
          Value: ['RDSSubnetGroup'],
        },
        RedshiftSubnetGroup: {
          Description: 'Subnet Group for elasticache',
          Export: {
            Name: {
              'Fn::Join': ['-', ["Fn::Ref 'AWS::StackName'", 'RedshiftSubnetGroup']],
            },
          },
          Value: ['RedshiftSubnetGroup'],
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Export: {
            Name: {
              'Fn::Join': ['-', ["Fn::Ref 'AWS::StackName'", 'VPC']],
            },
          },
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs(false, VALID_SUBNET_GROUPS, true);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

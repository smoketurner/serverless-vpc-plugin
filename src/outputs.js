const { VALID_SUBNET_GROUPS } = require('./constants');

/**
 * Build CloudFormation Outputs on common resources
 *
 * @param {Boolean} createBastionHost
 * @param {String[]} subnetGroups
 * @param {Boolean} exportOutputs
 * @return {Object}
 */

function buildOutputs(
  createBastionHost = false,
  subnetGroups = VALID_SUBNET_GROUPS,
  exportOutputs = false,
) {
  const outputs = {
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

  if (exportOutputs) {
    Object.entries(outputs).forEach(([name, value]) => {
      // eslint-disable-next-line no-param-reassign
      value.Export = { Name: { '!Join': ['-', ["!Ref 'AWS::StackName'", name]] } };
    });
  }

  if (createBastionHost) {
    outputs.BastionSSHUser = {
      Description: 'SSH username for the Bastion host',
      Value: 'ec2-user',
    };
    outputs.BastionEIP = {
      Description: 'Public IP of Bastion host',
      Value: {
        Ref: 'BastionEIP',
      },
    };
  }

  if (subnetGroups) {
    const typesToNames = {
      rds: 'RDSSubnetGroup',
      redshift: 'ElastiCacheSubnetGroup',
      elasticache: 'RedshiftSubnetGroup',
      dax: 'DAXSubnetGroup',
    };

    const subnetOutputs = subnetGroups.map(subnetGroup => ({
      [typesToNames[subnetGroup]]: {
        Description: `Subnet Group for ${subnetGroup}`,
        Value: [typesToNames[subnetGroup]],
      },
    }));

    Object.assign(outputs, ...subnetOutputs);
  }

  return outputs;
}

module.exports = {
  buildOutputs,
};

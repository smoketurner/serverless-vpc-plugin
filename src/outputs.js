/**
 * Build CloudFormation Outputs on common resources
 *
 * @param {Boolean} createBastionHost
 * @return {Object}
 */
function buildOutputs(createBastionHost = false, exportOutputs = false) {
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

  return outputs;
}

module.exports = {
  buildOutputs,
};

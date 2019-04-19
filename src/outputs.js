/**
 * Build CloudFormation Outputs on common resources
 *
 * @param {Boolean} createBastionHost
 * @return {Object}
 */
function buildOutputs(createBastionHost = false) {
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

  if (createBastionHost) {
    outputs.BastionUser = {
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

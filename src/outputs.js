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
    outputs.BastionPublicDnsName = {
      Description: 'Public DNS of Bastion host',
      Value: {
        'Fn::GetAtt': ['BastionInstance', 'PublicDnsName'],
      },
    };
  }

  return outputs;
}

module.exports = {
  buildOutputs,
};

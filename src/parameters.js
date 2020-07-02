/**
 * Build an AWS Systems Manager Parmeter
 *
 * @param {String} LogicalResourceId
 * @param {Object} params
 * @return {Object}
 */
function buildParameter(LogicalResourceId, { Value = null } = {}) {
  let Type = 'String';
  if (Value) {
    if (Array.isArray(Value)) {
      Type = 'StringList';
      // eslint-disable-next-line no-param-reassign
      Value = {
        'Fn::Join': [',', Value],
      };
    }
  } else {
    // eslint-disable-next-line no-param-reassign
    Value = { Ref: LogicalResourceId };
  }

  const cfName = `Parameter${LogicalResourceId}`;
  return {
    [cfName]: {
      Type: 'AWS::SSM::Parameter',
      Properties: {
        Name: {
          'Fn::Sub': `/SLS/\${AWS::StackName}/${LogicalResourceId}`,
        },
        Tier: 'Standard',
        Type,
        Value,
      },
    },
  };
}

module.exports = {
  buildParameter,
};

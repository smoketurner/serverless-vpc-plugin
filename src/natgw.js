const { PUBLIC_SUBNET } = require('./constants');

/**
 * Build an EIP
 *
 * @param {Number} position
 * @return {Object}
 */
function buildEIP(position) {
  const cfName = `EIP${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::EIP',
      Properties: {
        Domain: 'vpc',
      },
    },
  };
}

/**
 * Build a NatGateway in a given AZ
 *
 * @param {Number} position
 * @return {Object}
 */
function buildNatGateway(position) {
  const cfName = `NatGateway${position}`;
  const subnet = `${PUBLIC_SUBNET}Subnet${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::NatGateway',
      Properties: {
        AllocationId: {
          'Fn::GetAtt': [`EIP${position}`, 'AllocationId'],
        },
        SubnetId: {
          Ref: subnet,
        },
        Tags: [
          {
            Key: 'Name',
            Value: {
              'Fn::Sub': `\${AWS::StackName}-\${${subnet}.AvailabilityZone}`,
            },
          },
          {
            Key: 'Network',
            Value: 'Public',
          },
        ],
      },
    },
  };
}

module.exports = {
  buildEIP,
  buildNatGateway,
};

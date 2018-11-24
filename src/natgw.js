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
 * @param {String} stage
 * @param {Number} position
 * @param {String} zone
 * @return {Object}
 */
function buildNatGateway(stage, position, zone) {
  const cfName = `NatGateway${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::NatGateway',
      Properties: {
        AllocationId: {
          'Fn::GetAtt': [
            `EIP${position}`,
            'AllocationId',
          ],
        },
        SubnetId: {
          Ref: `${PUBLIC_SUBNET}Subnet${position}`,
        },
        Tags: [
          {
            Key: 'STAGE',
            Value: stage,
          },
          {
            Key: 'Name',
            Value: {
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  zone,
                ],
              ],
            },
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

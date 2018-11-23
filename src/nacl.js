const merge = require('lodash.merge');

const {
  APP_SUBNET, PUBLIC_SUBNET, DB_SUBNET,
} = require('./constants');

/**
 * Build a Network Access Control List (ACL)
 *
 * @param {String} name
 * @param {String} stage
 * @return {Object}
 */
function buildNetworkAcl(name, stage) {
  const cfName = `${name}NetworkAcl`;

  return {
    [cfName]: {
      Type: 'AWS::EC2::NetworkAcl',
      Properties: {
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
                  name.toLowerCase(),
                ],
              ],
            },
          },
        ],
        VpcId: {
          Ref: 'VPC',
        },
      },
    },
  };
}

/**
 * Build a Network ACL entry
 *
 * @param {String} name
 * @param {String} cidrBlock
 * @param {Object} params
 * @return {Object}
 */
function buildNetworkAclEntry(name, cidrBlock, {
  Egress = false, Protocol = -1, RuleAction = 'allow', RuleNumber = 100,
} = {}) {
  const direction = (Egress) ? 'Egress' : 'Ingress';
  const cfName = `${name}${direction}${RuleNumber}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::NetworkAclEntry',
      Properties: {
        CidrBlock: cidrBlock,
        NetworkAclId: {
          Ref: name,
        },
        Egress,
        Protocol,
        RuleAction,
        RuleNumber,
      },
    },
  };
}

/**
 * Build a Subnet Network ACL Association
 *
 * @param {String} name
 * @param {Number} position
 */
function buildNetworkAclAssociation(name, position) {
  const cfName = `${name}SubnetNetworkAclAssociation${position}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::SubnetNetworkAclAssociation',
      Properties: {
        SubnetId: {
          Ref: `${name}Subnet${position}`,
        },
        NetworkAclId: {
          Ref: `${name}NetworkAcl`,
        },
      },
    },
  };
}

/**
 * Build the Public Network ACL
 *
 * @param {Number} numZones
 * @param {String} stage
 */
function buildPublicNetworkAcl(numZones, stage) {
  if (numZones < 1) {
    return {};
  }

  const resources = {};

  merge(
    resources,
    buildNetworkAcl(PUBLIC_SUBNET, stage),
    buildNetworkAclEntry(
      `${PUBLIC_SUBNET}NetworkAcl`,
      '0.0.0.0/0',
    ),
    buildNetworkAclEntry(
      `${PUBLIC_SUBNET}NetworkAcl`,
      '0.0.0.0/0',
      { Egress: true },
    ),
  );

  for (let i = 1; i <= numZones; i += 1) {
    merge(
      resources,
      buildNetworkAclAssociation(PUBLIC_SUBNET, i),
    );
  }

  return resources;
}

/**
 * Build the Application Network ACL
 *
 * @param {Array} publicSubnets
 * @param {String} stage
 */
function buildAppNetworkAcl(publicSubnets, stage) {
  if (publicSubnets.length < 1) {
    return {};
  }

  const resources = buildNetworkAcl(APP_SUBNET, stage);

  publicSubnets.forEach((subnet, index) => {
    merge(
      resources,
      buildNetworkAclEntry(
        `${APP_SUBNET}NetworkAcl`,
        subnet,
        { RuleNumber: 100 + index },
      ),
      buildNetworkAclEntry(
        `${APP_SUBNET}NetworkAcl`,
        subnet,
        { RuleNumber: 100 + index, Egress: true },
      ),
      buildNetworkAclAssociation(APP_SUBNET, index + 1),
    );
  });

  return resources;
}

/**
 * Build the Database Network ACL
 *
 * @param {Array} appSubnets
 * @param {String} stage
 */
function buildDBNetworkAcl(appSubnets, stage) {
  if (appSubnets.length < 1) {
    return {};
  }

  const resources = buildNetworkAcl(DB_SUBNET, stage);

  appSubnets.forEach((subnet, index) => {
    merge(
      resources,
      buildNetworkAclEntry(
        `${DB_SUBNET}NetworkAcl`,
        subnet,
        { RuleNumber: 100 + index },
      ),
      buildNetworkAclEntry(
        `${DB_SUBNET}NetworkAcl`,
        subnet,
        { RuleNumber: 100 + index, Egress: true },
      ),
      buildNetworkAclAssociation(DB_SUBNET, index + 1),
    );
  });

  return resources;
}

module.exports = {
  buildNetworkAcl,
  buildNetworkAclEntry,
  buildNetworkAclAssociation,
  buildPublicNetworkAcl,
  buildAppNetworkAcl,
  buildDBNetworkAcl,
};

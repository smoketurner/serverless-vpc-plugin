const { APP_SUBNET, PUBLIC_SUBNET, DB_SUBNET } = require('./constants');

/**
 * Build a Network Access Control List (ACL)
 *
 * @param {String} name
 * @return {Object}
 */
function buildNetworkAcl(name) {
  const cfName = `${name}NetworkAcl`;

  return {
    [cfName]: {
      Type: 'AWS::EC2::NetworkAcl',
      Properties: {
        Tags: [
          {
            Key: 'Name',
            Value: {
              'Fn::Sub': `\${AWS::StackName}-${name.toLowerCase()}`,
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
 * @param {String} CidrBlock
 * @param {Object} params
 * @return {Object}
 */
function buildNetworkAclEntry(
  name,
  CidrBlock,
  { Egress = false, Protocol = -1, RuleAction = 'allow', RuleNumber = 100 } = {},
) {
  const direction = Egress ? 'Egress' : 'Ingress';
  const cfName = `${name}${direction}${RuleNumber}`;
  return {
    [cfName]: {
      Type: 'AWS::EC2::NetworkAclEntry',
      Properties: {
        CidrBlock,
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
 * @param {Number} numZones Number of availability zones
 */
function buildPublicNetworkAcl(numZones = 0) {
  if (numZones < 1) {
    return {};
  }

  const resources = {};

  Object.assign(
    resources,
    buildNetworkAcl(PUBLIC_SUBNET),
    buildNetworkAclEntry(`${PUBLIC_SUBNET}NetworkAcl`, '0.0.0.0/0'),
    buildNetworkAclEntry(`${PUBLIC_SUBNET}NetworkAcl`, '0.0.0.0/0', {
      Egress: true,
    }),
  );

  for (let i = 1; i <= numZones; i += 1) {
    Object.assign(resources, buildNetworkAclAssociation(PUBLIC_SUBNET, i));
  }

  return resources;
}

/**
 * Build the Application Network ACL
 *
 * @param {Number} numZones Number of availability zones
 */
function buildAppNetworkAcl(numZones = 0) {
  if (numZones < 1) {
    return {};
  }

  const resources = {};

  Object.assign(
    resources,
    buildNetworkAcl(APP_SUBNET),
    buildNetworkAclEntry(`${APP_SUBNET}NetworkAcl`, '0.0.0.0/0'),
    buildNetworkAclEntry(`${APP_SUBNET}NetworkAcl`, '0.0.0.0/0', {
      Egress: true,
    }),
  );

  for (let i = 1; i <= numZones; i += 1) {
    Object.assign(resources, buildNetworkAclAssociation(APP_SUBNET, i));
  }

  return resources;
}

/**
 * Build the Database Network ACL
 *
 * @param {Array} appSubnets Array of application subnets
 */
function buildDBNetworkAcl(appSubnets = []) {
  if (!Array.isArray(appSubnets) || appSubnets.length < 1) {
    return {};
  }

  const resources = buildNetworkAcl(DB_SUBNET);

  appSubnets.forEach((subnet, index) => {
    Object.assign(
      resources,
      buildNetworkAclEntry(`${DB_SUBNET}NetworkAcl`, subnet, {
        RuleNumber: 100 + index,
      }),
      buildNetworkAclEntry(`${DB_SUBNET}NetworkAcl`, subnet, {
        RuleNumber: 100 + index,
        Egress: true,
      }),
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

const { DB_SUBNET } = require('./constants');

/**
 * Build an RDSubnetGroup for a given number of zones
 *
 * @param {String} stage
 * @param {Objects} params
 * @return {Object}
 */
function buildRDSSubnetGroup(
  stage,
  { name = 'RDSSubnetGroup', numZones = 0 } = {}
) {
  if (numZones < 1) {
    return {};
  }

  const subnetIds = [];
  for (let i = 1; i <= numZones; i += 1) {
    subnetIds.push({ Ref: `${DB_SUBNET}Subnet${i}` });
  }

  return {
    [name]: {
      Type: 'AWS::RDS::DBSubnetGroup',
      Properties: {
        DBSubnetGroupName: {
          Ref: 'AWS::StackName'
        },
        DBSubnetGroupDescription: {
          Ref: 'AWS::StackName'
        },
        SubnetIds: subnetIds,
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          }
        ]
      }
    }
  };
}

/**
 * Build an ElastiCacheSubnetGroup for a given number of zones
 *
 * @param {Object} params
 * @return {Object}
 */
function buildElastiCacheSubnetGroup({
  name = 'ElastiCacheSubnetGroup',
  numZones = 0
} = {}) {
  if (numZones < 1) {
    return {};
  }

  const subnetIds = [];
  for (let i = 1; i <= numZones; i += 1) {
    subnetIds.push({ Ref: `${DB_SUBNET}Subnet${i}` });
  }

  return {
    [name]: {
      Type: 'AWS::ElastiCache::SubnetGroup',
      Properties: {
        CacheSubnetGroupName: {
          Ref: 'AWS::StackName'
        },
        Description: {
          Ref: 'AWS::StackName'
        },
        SubnetIds: subnetIds
      }
    }
  };
}

/**
 * Build an RedshiftSubnetGroup for a given number of zones
 *
 * @param {String} stage
 * @param {Object} params
 * @return {Object}
 */
function buildRedshiftSubnetGroup(
  stage,
  { name = 'RedshiftSubnetGroup', numZones = 0 } = {}
) {
  if (numZones < 1) {
    return {};
  }

  const subnetIds = [];
  for (let i = 1; i <= numZones; i += 1) {
    subnetIds.push({ Ref: `${DB_SUBNET}Subnet${i}` });
  }

  return {
    [name]: {
      Type: 'AWS::Redshift::ClusterSubnetGroup',
      Properties: {
        Description: {
          Ref: 'AWS::StackName'
        },
        SubnetIds: subnetIds,
        Tags: [
          {
            Key: 'STAGE',
            Value: stage
          }
        ]
      }
    }
  };
}

/**
 * Build an DAXSubnetGroup for a given number of zones
 *
 * @param {Object} params
 * @return {Object}
 */
function buildDAXSubnetGroup({ name = 'DAXSubnetGroup', numZones = 0 } = {}) {
  if (numZones < 1) {
    return {};
  }

  const subnetIds = [];
  for (let i = 1; i <= numZones; i += 1) {
    subnetIds.push({ Ref: `${DB_SUBNET}Subnet${i}` });
  }

  return {
    [name]: {
      Type: 'AWS::DAX::SubnetGroup',
      Properties: {
        SubnetGroupName: {
          Ref: 'AWS::StackName'
        },
        Description: {
          Ref: 'AWS::StackName'
        },
        SubnetIds: subnetIds
      }
    }
  };
}

module.exports = {
  buildRDSSubnetGroup,
  buildRedshiftSubnetGroup,
  buildElastiCacheSubnetGroup,
  buildDAXSubnetGroup
};

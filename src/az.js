const { APP_SUBNET, PUBLIC_SUBNET, DB_SUBNET } = require('./constants');
const { buildEIP, buildNatGateway } = require('./natgw');
const { buildSubnet } = require('./subnets');
const { buildRoute, buildRouteTable, buildRouteTableAssociation } = require('./routes');

/**
 * Builds the Availability Zones for the region.
 *
 * 1.) Splits the VPC CIDR Block into /20 subnets, one per AZ.
 * 2.) Split each AZ /20 CIDR Block into two /21 subnets
 * 3.) Use the first /21 subnet for Applications
 * 4.) Split the second /21 subnet into two /22 subnets: one Public subnet (for load balancers),
 *     and one for databases (RDS, ElastiCache, and Redshift)
 *
 * @param {Map} subnets Map of subnets
 * @param {Array} zones Array of availability zones
 * @param {Number} numNatGateway Number of NAT gateways (and EIPs) to provision
 * @param {Boolean} createDbSubnet Whether to create the DBSubnet or not
 * @param {Boolean} createNatInstance Whether to create a NAT instance or not
 * @return {Object}
 */
function buildAvailabilityZones(
  subnets,
  zones = [],
  { numNatGateway = 0, createDbSubnet = true, createNatInstance = false } = {},
) {
  if (!(subnets instanceof Map) || subnets.size < 1) {
    return {};
  }
  if (!Array.isArray(zones) || zones.length < 1) {
    return {};
  }

  const resources = {};

  if (numNatGateway > 0) {
    for (let index = 1; index <= numNatGateway; index += 1) {
      Object.assign(resources, buildEIP(index), buildNatGateway(index));
    }
  }

  zones.forEach((zone, index) => {
    const position = index + 1;

    Object.assign(
      resources,

      // App Subnet
      buildSubnet(APP_SUBNET, position, zone, subnets.get(zone).get(APP_SUBNET)),
      buildRouteTable(APP_SUBNET, position),
      buildRouteTableAssociation(APP_SUBNET, position),
      // no default route on Application subnet

      // Public Subnet
      buildSubnet(PUBLIC_SUBNET, position, zone, subnets.get(zone).get(PUBLIC_SUBNET)),
      buildRouteTable(PUBLIC_SUBNET, position),
      buildRouteTableAssociation(PUBLIC_SUBNET, position),
      buildRoute(PUBLIC_SUBNET, position, {
        GatewayId: 'InternetGateway',
      }),
    );

    const params = {};
    if (numNatGateway > 0) {
      params.NatGatewayId = `NatGateway${(index % numNatGateway) + 1}`;
    } else if (createNatInstance) {
      params.InstanceId = 'NatInstance';
    }

    // only set default route on Application subnet to a NAT Gateway or NAT Instance
    if (Object.keys(params).length > 0) {
      Object.assign(resources, buildRoute(APP_SUBNET, position, params));
    }

    if (createDbSubnet) {
      // DB Subnet
      Object.assign(
        resources,
        buildSubnet(DB_SUBNET, position, zone, subnets.get(zone).get(DB_SUBNET)),
        buildRouteTable(DB_SUBNET, position),
        buildRouteTableAssociation(DB_SUBNET, position),
        // no default route on DB subnet
      );
    }
  });

  return resources;
}

module.exports = {
  buildAvailabilityZones,
};

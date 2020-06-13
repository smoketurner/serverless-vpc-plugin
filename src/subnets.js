const CIDR = require('cidr-split');

const { APP_SUBNET, PUBLIC_SUBNET, DB_SUBNET } = require('./constants');

/**
 * Split a /16 CIDR block into /20 CIDR blocks.
 *
 * @param {String} cidrBlock VPC CIDR block
 * @return {Array}
 */
function splitVpc(cidrBlock) {
  return CIDR.fromString(cidrBlock)
    .split()
    .map((cidr) => cidr.split())
    .reduce((all, halves) => all.concat(...halves))
    .map((cidr) => cidr.split())
    .reduce((all, halves) => all.concat(...halves))
    .map((cidr) => cidr.split())
    .reduce((all, halves) => all.concat(...halves));
}

/**
 * Splits the /16 VPC CIDR block into /20 subnets per AZ:
 *
 * Application subnet = /21
 * Public subnet = /22
 * Database subnet = /22
 *
 * @param {String} cidrBlock VPC CIDR block
 * @param {Array} zones Array of availability zones
 * @return {Map}
 */
function splitSubnets(cidrBlock, zones = []) {
  const mapping = new Map();

  if (!cidrBlock || !Array.isArray(zones) || zones.length < 1) {
    return mapping;
  }

  const azCidrBlocks = splitVpc(cidrBlock); // VPC subnet is a /16

  const publicSubnets = [];
  const appSubnets = [];
  const dbSubnets = [];

  zones.forEach((zone, index) => {
    const azCidrBlock = azCidrBlocks[index]; // AZ subnet is a /20
    const subnets = [];

    const azSubnets = CIDR.fromString(azCidrBlock)
      .split()
      .map((cidr) => cidr.toString());
    subnets.push(azSubnets[0]); // Application subnet is a /21

    const smallerSubnets = CIDR.fromString(azSubnets[1])
      .split()
      .map((cidr) => cidr.toString());
    subnets.push(...smallerSubnets); // Public and DB subnets are both /22

    const parts = [
      [APP_SUBNET, subnets[0]],
      [PUBLIC_SUBNET, subnets[1]],
      [DB_SUBNET, subnets[2]],
    ];

    appSubnets.push(subnets[0]);
    publicSubnets.push(subnets[1]);
    dbSubnets.push(subnets[2]);

    mapping.set(zone, new Map(parts));
  });

  mapping.set(PUBLIC_SUBNET, publicSubnets);
  mapping.set(APP_SUBNET, appSubnets);
  mapping.set(DB_SUBNET, dbSubnets);

  return mapping;
}

module.exports = {
  splitVpc,
  splitSubnets,
};

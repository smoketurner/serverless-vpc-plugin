/**
 * @see https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
 */
const DEFAULT_VPC_EIP_LIMIT = 5;

// Subnet name constants
const APP_SUBNET = 'App';
const PUBLIC_SUBNET = 'Public';
const DB_SUBNET = 'DB';

module.exports = {
  DEFAULT_VPC_EIP_LIMIT,
  APP_SUBNET,
  PUBLIC_SUBNET,
  DB_SUBNET
};

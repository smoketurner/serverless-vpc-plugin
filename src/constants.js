/**
 * @type {Number} Default EIP limit per VPC
 * @see https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
 */
const DEFAULT_VPC_EIP_LIMIT = 5;

/**
 * @type {String} Application subnet
 */
const APP_SUBNET = 'App';

/**
 * @type {String} Public subnet
 */
const PUBLIC_SUBNET = 'Public';

/**
 * @type {String} Database subnet
 */
const DB_SUBNET = 'DB';

/**
 * @type {Array} Valid subnet groups
 */
const VALID_SUBNET_GROUPS = ['rds', 'redshift', 'elasticache', 'dax'];

module.exports = {
  DEFAULT_VPC_EIP_LIMIT,
  APP_SUBNET,
  PUBLIC_SUBNET,
  DB_SUBNET,
  VALID_SUBNET_GROUPS,
};

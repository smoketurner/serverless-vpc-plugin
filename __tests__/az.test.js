const { buildAvailabilityZones } = require('../src/az');
const { splitSubnets } = require('../src/subnets');

// fixtures
const vpcSingleAZNatGWDB = require('./fixtures/vpc_single_az_natgw_db.json');
const vpcSingleAZNoNatGWDB = require('./fixtures/vpc_single_az_no_natgw_db.json');
const vpcSingleAZNatGWNoDB = require('./fixtures/vpc_single_az_natgw_no_db.json');
const vpcSingleAZNoNatGWNoDB = require('./fixtures/vpc_single_az_no_natgw_no_db.json');

const vpcMultipleAZNatGWDB = require('./fixtures/vpc_multiple_az_natgw_db.json');
const vpcMultipleAZNoNatGWDB = require('./fixtures/vpc_multiple_az_no_natgw_db.json');
const vpcMultipleAZNatGWNoDB = require('./fixtures/vpc_multiple_az_natgw_no_db.json');
const vpcMultipleAZNoNatGWNoDB = require('./fixtures/vpc_multiple_az_no_natgw_no_db.json');

const vpcMultipleAZSingleNatGWNoDB = require('./fixtures/vpc_multiple_az_single_natgw_no_db.json');
// eslint-disable-next-line max-len
const vpcMultipleAZMultipleNatGWNoDB = require('./fixtures/vpc_multiple_az_multiple_natgw_no_db.json');

describe('az', () => {
  describe('#buildAvailabilityZones', () => {
    it('builds no AZs without options', () => {
      const actual = buildAvailabilityZones();
      expect(actual).toEqual({});
      expect.assertions(1);
    });

    it('builds a single AZ with a NAT Gateway and DBSubnet', () => {
      const expected = { ...vpcSingleAZNatGWDB };

      const zones = ['us-east-1a'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 1,
        createDbSubnet: true,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ without a NAT Gateway and DBSubnet', () => {
      const expected = { ...vpcSingleAZNoNatGWDB };

      const zones = ['us-east-1a'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 0,
        createDbSubnet: true,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ with a NAT Gateway and no DBSubnet', () => {
      const expected = { ...vpcSingleAZNatGWNoDB };

      const zones = ['us-east-1a'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 1,
        createDbSubnet: false,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds a single AZ without a NAT Gateway and no DBSubnet', () => {
      const expected = { ...vpcSingleAZNoNatGWNoDB };

      const zones = ['us-east-1a'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 0,
        createDbSubnet: false,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a NAT Gateway and DBSubnet', () => {
      const expected = { ...vpcMultipleAZNatGWDB };

      const zones = ['us-east-1a', 'us-east-1b'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 2,
        createDbSubnet: true,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs without a NAT Gateway and DBSubnet', () => {
      const expected = { ...vpcMultipleAZNoNatGWDB };

      const zones = ['us-east-1a', 'us-east-1b'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 0,
        createDbSubnet: true,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a NAT Gateway and no DBSubnet', () => {
      const expected = { ...vpcMultipleAZNatGWNoDB };

      const zones = ['us-east-1a', 'us-east-1b'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 2,
        createDbSubnet: false,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs without a NAT Gateway and no DBSubnet', () => {
      const expected = { ...vpcMultipleAZNoNatGWNoDB };

      const zones = ['us-east-1a', 'us-east-1b'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 0,
        createDbSubnet: false,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a single NAT Gateway and no DBSubnet', () => {
      const expected = { ...vpcMultipleAZSingleNatGWNoDB };

      const zones = ['us-east-1a', 'us-east-1b'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 1,
        createDbSubnet: false,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds multiple AZs with a multple NAT Gateways and no DBSubnet', () => {
      const expected = { ...vpcMultipleAZMultipleNatGWNoDB };

      const zones = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
      const subnets = splitSubnets('10.0.0.0/16', zones);
      const actual = buildAvailabilityZones(subnets, zones, {
        numNatGateway: 2,
        createDbSubnet: false,
      });

      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

const {
  buildRDSSubnetGroup,
  buildElastiCacheSubnetGroup,
  buildRedshiftSubnetGroup,
  buildDAXSubnetGroup,
} = require('../src/subnet_groups');

describe('subnet_groups', () => {
  describe('#buildRDSSubnetGroup', () => {
    it('skips building an RDS subnet group with no zones', () => {
      const actual = buildRDSSubnetGroup();
      expect(actual).toEqual({});
    });

    it('builds an RDS subnet group', () => {
      const expected = {
        RDSSubnetGroup: {
          Type: 'AWS::RDS::DBSubnetGroup',
          Properties: {
            DBSubnetGroupName: {
              Ref: 'AWS::StackName',
            },
            DBSubnetGroupDescription: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
            ],
          },
        },
      };
      const actual = buildRDSSubnetGroup('dev', { numZones: 2 });
      expect(actual).toEqual(expected);
    });

    it('builds an RDS subnet group with a custom name', () => {
      const expected = {
        MyRDSSubnetGroup: {
          Type: 'AWS::RDS::DBSubnetGroup',
          Properties: {
            DBSubnetGroupName: {
              Ref: 'AWS::StackName',
            },
            DBSubnetGroupDescription: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
            ],
          },
        },
      };
      const actual = buildRDSSubnetGroup('dev', { name: 'MyRDSSubnetGroup', numZones: 2 });
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildElastiCacheSubnetGroup', () => {
    it('skips building an ElastiCache subnet group with no zones', () => {
      const actual = buildElastiCacheSubnetGroup();
      expect(actual).toEqual({});
    });

    it('builds an ElastiCache subnet group', () => {
      const expected = {
        ElastiCacheSubnetGroup: {
          Type: 'AWS::ElastiCache::SubnetGroup',
          Properties: {
            CacheSubnetGroupName: {
              Ref: 'AWS::StackName',
            },
            Description: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
          },
        },
      };
      const actual = buildElastiCacheSubnetGroup({ numZones: 2 });
      expect(actual).toEqual(expected);
    });

    it('builds an ElastiCache subnet group with a custom name', () => {
      const expected = {
        MyElastiCacheSubnetGroup: {
          Type: 'AWS::ElastiCache::SubnetGroup',
          Properties: {
            CacheSubnetGroupName: {
              Ref: 'AWS::StackName',
            },
            Description: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
          },
        },
      };
      const actual = buildElastiCacheSubnetGroup({
        name: 'MyElastiCacheSubnetGroup', numZones: 2,
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildRedshiftSubnetGroup', () => {
    it('skips building a Redshift subnet group with no zones', () => {
      const actual = buildRedshiftSubnetGroup();
      expect(actual).toEqual({});
    });

    it('builds an Redshift subnet group', () => {
      const expected = {
        RedshiftSubnetGroup: {
          Type: 'AWS::Redshift::ClusterSubnetGroup',
          Properties: {
            Description: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
            ],
          },
        },
      };
      const actual = buildRedshiftSubnetGroup('dev', { numZones: 2 });
      expect(actual).toEqual(expected);
    });

    it('builds an Redshift subnet group with a custom name', () => {
      const expected = {
        MyRedshiftSubnetGroup: {
          Type: 'AWS::Redshift::ClusterSubnetGroup',
          Properties: {
            Description: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
            Tags: [
              {
                Key: 'STAGE',
                Value: 'dev',
              },
            ],
          },
        },
      };
      const actual = buildRedshiftSubnetGroup('dev', {
        name: 'MyRedshiftSubnetGroup', numZones: 2,
      });
      expect(actual).toEqual(expected);
    });
  });

  describe('#buildDAXSubnetGroup', () => {
    it('skips building an DAX subnet group with no zones', () => {
      const actual = buildDAXSubnetGroup();
      expect(actual).toEqual({});
    });

    it('builds an DAX subnet group', () => {
      const expected = {
        DAXSubnetGroup: {
          Type: 'AWS::DAX::SubnetGroup',
          Properties: {
            SubnetGroupName: {
              Ref: 'AWS::StackName',
            },
            Description: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
          },
        },
      };
      const actual = buildDAXSubnetGroup({ numZones: 2 });
      expect(actual).toEqual(expected);
    });

    it('builds an DAX subnet group with a custom name', () => {
      const expected = {
        MyDAXSubnetGroup: {
          Type: 'AWS::DAX::SubnetGroup',
          Properties: {
            SubnetGroupName: {
              Ref: 'AWS::StackName',
            },
            Description: {
              Ref: 'AWS::StackName',
            },
            SubnetIds: [
              {
                Ref: 'DBSubnet1',
              },
              {
                Ref: 'DBSubnet2',
              },
            ],
          },
        },
      };
      const actual = buildDAXSubnetGroup({
        name: 'MyDAXSubnetGroup', numZones: 2,
      });
      expect(actual).toEqual(expected);
    });
  });
});

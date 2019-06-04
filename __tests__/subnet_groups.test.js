const {
  buildRDSSubnetGroup,
  buildElastiCacheSubnetGroup,
  buildRedshiftSubnetGroup,
  buildDAXSubnetGroup,
  buildSubnetGroups,
} = require('../src/subnet_groups');

describe('subnet_groups', () => {
  describe('#buildRDSSubnetGroup', () => {
    it('skips building an RDS subnet group with no zones', () => {
      const actual = buildRDSSubnetGroup();
      expect(actual).toEqual({});
      expect.assertions(1);
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
          },
        },
      };
      const actual = buildRDSSubnetGroup(2);
      expect(actual).toEqual(expected);
      expect.assertions(1);
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
          },
        },
      };
      const actual = buildRDSSubnetGroup(2, {
        name: 'MyRDSSubnetGroup',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildElastiCacheSubnetGroup', () => {
    it('skips building an ElastiCache subnet group with no zones', () => {
      const actual = buildElastiCacheSubnetGroup();
      expect(actual).toEqual({});
      expect.assertions(1);
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
      const actual = buildElastiCacheSubnetGroup(2);
      expect(actual).toEqual(expected);
      expect.assertions(1);
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
      const actual = buildElastiCacheSubnetGroup(2, {
        name: 'MyElastiCacheSubnetGroup',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildRedshiftSubnetGroup', () => {
    it('skips building a Redshift subnet group with no zones', () => {
      const actual = buildRedshiftSubnetGroup();
      expect(actual).toEqual({});
      expect.assertions(1);
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
          },
        },
      };
      const actual = buildRedshiftSubnetGroup(2);
      expect(actual).toEqual(expected);
      expect.assertions(1);
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
          },
        },
      };
      const actual = buildRedshiftSubnetGroup(2, {
        name: 'MyRedshiftSubnetGroup',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildDAXSubnetGroup', () => {
    it('skips building an DAX subnet group with no zones', () => {
      const actual = buildDAXSubnetGroup();
      expect(actual).toEqual({});
      expect.assertions(1);
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
      const actual = buildDAXSubnetGroup(2);
      expect(actual).toEqual(expected);
      expect.assertions(1);
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
      const actual = buildDAXSubnetGroup(2, {
        name: 'MyDAXSubnetGroup',
      });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });

  describe('#buildSubnetGroups', () => {
    it('skips building if no groups specified', () => {
      const expected = {};
      const actual = buildSubnetGroups(2, []);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds an RDS and Redshift subnet groups', () => {
      const expected = {
        RDSSubnetGroup: {
          Properties: {
            DBSubnetGroupDescription: {
              Ref: 'AWS::StackName',
            },
            DBSubnetGroupName: {
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
          Type: 'AWS::RDS::DBSubnetGroup',
        },
        RedshiftSubnetGroup: {
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
          },
          Type: 'AWS::Redshift::ClusterSubnetGroup',
        },
      };
      const actual = buildSubnetGroups(2, ['rds', 'redshift']);
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

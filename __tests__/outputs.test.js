const { buildOutputs } = require('../src/outputs');

describe('outputs', () => {
  describe('#buildOutputs', () => {
    it('builds the outputs with no bastion host', () => {
      const subnets = [1, 2, 3].map((i) => ({
        Ref: `AppSubnet${i}`,
      }));
      const expected = {
        AppSubnet1: {
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        AppSubnet2: {
          Value: {
            Ref: 'AppSubnet2',
          },
        },
        AppSubnet3: {
          Value: {
            Ref: 'AppSubnet3',
          },
        },
        DAXSubnetGroup: {
          Description: 'Subnet Group for dax',
          Value: {
            Ref: 'DAXSubnetGroup',
          },
        },
        ElastiCacheSubnetGroup: {
          Description: 'Subnet Group for elasticache',
          Value: {
            Ref: 'ElastiCacheSubnetGroup',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description: 'DEPRECATED - Please use AppSecurityGroupId instead',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        AppSecurityGroupId: {
          Description: 'Security Group ID that the applications use when executing within the VPC',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Value: {
            Ref: 'RDSSubnetGroup',
          },
        },
        RedshiftSubnetGroup: {
          Description: 'Subnet Group for redshift',
          Value: {
            Ref: 'RedshiftSubnetGroup',
          },
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs({ subnets });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds the outputs with a bastion host', () => {
      const subnets = [1, 2, 3].map((i) => ({
        Ref: `AppSubnet${i}`,
      }));
      const expected = {
        AppSubnet1: {
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        AppSubnet2: {
          Value: {
            Ref: 'AppSubnet2',
          },
        },
        AppSubnet3: {
          Value: {
            Ref: 'AppSubnet3',
          },
        },
        BastionEIP: {
          Description: 'Public IP of Bastion host',
          Value: {
            Ref: 'BastionEIP',
          },
        },
        BastionSSHUser: {
          Description: 'SSH username for the Bastion host',
          Value: 'ec2-user',
        },
        DAXSubnetGroup: {
          Description: 'Subnet Group for dax',
          Value: {
            Ref: 'DAXSubnetGroup',
          },
        },
        ElastiCacheSubnetGroup: {
          Description: 'Subnet Group for elasticache',
          Value: {
            Ref: 'ElastiCacheSubnetGroup',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description: 'DEPRECATED - Please use AppSecurityGroupId instead',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        AppSecurityGroupId: {
          Description: 'Security Group ID that the applications use when executing within the VPC',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Value: {
            Ref: 'RDSSubnetGroup',
          },
        },
        RedshiftSubnetGroup: {
          Description: 'Subnet Group for redshift',
          Value: {
            Ref: 'RedshiftSubnetGroup',
          },
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs({ createBastionHost: true, subnets });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds the outputs with no DB subnet', () => {
      const subnets = [1, 2, 3].map((i) => ({
        Ref: `AppSubnet${i}`,
      }));
      const expected = {
        AppSubnet1: {
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        AppSubnet2: {
          Value: {
            Ref: 'AppSubnet2',
          },
        },
        AppSubnet3: {
          Value: {
            Ref: 'AppSubnet3',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description: 'DEPRECATED - Please use AppSecurityGroupId instead',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        AppSecurityGroupId: {
          Description: 'Security Group ID that the applications use when executing within the VPC',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs({ createDbSubnet: false, subnets });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('builds the outputs with subnets', () => {
      const subnets = [1, 2, 3].map((i) => ({
        Ref: `AppSubnet${i}`,
      }));
      const expected = {
        AppSubnet1: {
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        AppSubnet2: {
          Value: {
            Ref: 'AppSubnet2',
          },
        },
        AppSubnet3: {
          Value: {
            Ref: 'AppSubnet3',
          },
        },
      };
      const actual = buildOutputs({ createBastionHost: false, subnets });
      expect(actual).toEqual(expect.objectContaining(expected));
    });

    it('exports the stack output', () => {
      const subnets = [1, 2, 3].map((i) => ({
        Ref: `AppSubnet${i}`,
      }));
      const expected = {
        AppSubnet1: {
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-AppSubnet1',
            },
          },
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        AppSubnet2: {
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-AppSubnet2',
            },
          },
          Value: {
            Ref: 'AppSubnet2',
          },
        },
        AppSubnet3: {
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-AppSubnet3',
            },
          },
          Value: {
            Ref: 'AppSubnet3',
          },
        },
        DAXSubnetGroup: {
          Description: 'Subnet Group for dax',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-DAXSubnetGroup',
            },
          },
          Value: {
            Ref: 'DAXSubnetGroup',
          },
        },
        ElastiCacheSubnetGroup: {
          Description: 'Subnet Group for elasticache',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-ElastiCacheSubnetGroup',
            },
          },
          Value: {
            Ref: 'ElastiCacheSubnetGroup',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description: 'DEPRECATED - Please use AppSecurityGroupId instead',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-LambdaExecutionSecurityGroupId',
            },
          },
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        AppSecurityGroupId: {
          Description: 'Security Group ID that the applications use when executing within the VPC',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-AppSecurityGroupId',
            },
          },
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-RDSSubnetGroup',
            },
          },
          Value: {
            Ref: 'RDSSubnetGroup',
          },
        },
        RedshiftSubnetGroup: {
          Description: 'Subnet Group for redshift',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-RedshiftSubnetGroup',
            },
          },
          Value: {
            Ref: 'RedshiftSubnetGroup',
          },
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Export: {
            Name: {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': '${AWS::StackName}-VPC',
            },
          },
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs({ createBastionHost: false, subnets, exportOutputs: true });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });

    it('does not output subnet groups with only a single subnet', () => {
      const subnets = [
        {
          Ref: 'AppSubnet1',
        },
      ];
      const expected = {
        AppSubnet1: {
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description: 'DEPRECATED - Please use AppSecurityGroupId instead',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        AppSecurityGroupId: {
          Description: 'Security Group ID that the applications use when executing within the VPC',
          Value: {
            Ref: 'AppSecurityGroup',
          },
        },
        VPC: {
          Description: 'VPC logical resource ID',
          Value: {
            Ref: 'VPC',
          },
        },
      };

      const actual = buildOutputs({ subnets });
      expect(actual).toEqual(expected);
      expect.assertions(1);
    });
  });
});

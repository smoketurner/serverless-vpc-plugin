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
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
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
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
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
              'Fn::Join': ['-', [{ Ref: 'AWS::StackName' }, 'AppSubnet1']],
            },
          },
          Value: {
            Ref: 'AppSubnet1',
          },
        },
        AppSubnet2: {
          Export: {
            Name: {
              'Fn::Join': ['-', [{ Ref: 'AWS::StackName' }, 'AppSubnet2']],
            },
          },
          Value: {
            Ref: 'AppSubnet2',
          },
        },
        AppSubnet3: {
          Export: {
            Name: {
              'Fn::Join': ['-', [{ Ref: 'AWS::StackName' }, 'AppSubnet3']],
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
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  'DAXSubnetGroup',
                ],
              ],
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
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  'ElastiCacheSubnetGroup',
                ],
              ],
            },
          },
          Value: {
            Ref: 'ElastiCacheSubnetGroup',
          },
        },
        LambdaExecutionSecurityGroupId: {
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Export: {
            Name: {
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  'LambdaExecutionSecurityGroupId',
                ],
              ],
            },
          },
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
          },
        },
        RDSSubnetGroup: {
          Description: 'Subnet Group for rds',
          Export: {
            Name: {
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  'RDSSubnetGroup',
                ],
              ],
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
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  'RedshiftSubnetGroup',
                ],
              ],
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
              'Fn::Join': [
                '-',
                [
                  {
                    Ref: 'AWS::StackName',
                  },
                  'VPC',
                ],
              ],
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
          Description:
            'Security Group logical resource ID that the Lambda functions use when executing within the VPC',
          Value: {
            Ref: 'LambdaExecutionSecurityGroup',
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

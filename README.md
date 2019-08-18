# serverless-vpc-plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-vpc-plugin.svg)](https://badge.fury.io/js/serverless-vpc-plugin)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/smoketurner/serverless-vpc-plugin/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/serverless-vpc-plugin.svg?style=flat)](https://www.npmjs.com/package/serverless-vpc-plugin)

Automatically creates an AWS Virtual Private Cloud (VPC) using all available Availability Zones (AZ) in a region.

This plugin provisions the following resources:

- `AWS::EC2::VPC`
- `AWS::EC2::InternetGateway` (for outbound internet access from "Public" subnet)
- `AWS::EC2::VPCGatewayAttachment` (to attach the `InternetGateway` to the VPC)
- `AWS::EC2::SecurityGroup` (to execute Lambda functions [`LambdaExecutionSecurityGroup`])

If the VPC is allocated a /16 subnet, each availability zone within the region will be allocated a /20 subnet. Within each availability zone, this plugin will further divide the subnets:

- `AWS::EC2::Subnet` "Public" (/22) - default route set to the `InternetGateway`
- `AWS::EC2::Subnet` "Application" (/21) - no default route set (can be set to either a `NatGateway` or `NatInstance`)
- `AWS::EC2::Subnet` "Database" (/22) - no default route set

The subnetting layout was heavily inspired by the now shutdown [Skyliner](https://skyliner.io) platform. 😞

Optionally, this plugin can also create `AWS::EC2::NatGateway` instances in each availability zone which requires provisioning `AWS::EC2::EIP` resources (AWS limits you to 5 per VPC, so if you want to provision your VPC across all 6 us-east availability zones, you'll need to request an VPC EIP limit increase from AWS).

Instead of using the managed `AWS::EC2::NatGateway` instances, this plugin can also provision a single `t2.micro` NAT instance in `PublicSubnet1` which will allow HTTP/HTTPS traffic from the "Application" subnets to reach the Internet.

Lambda functions will execute within the "Application" subnet and only be able to access:

- S3 (via an S3 VPC endpoint)
- DynamoDB (via an DynamoDB VPC endpoint)
- RDS instances (provisioned within the "DB" subnet)
- ElastiCache instances (provisioned within the "DB" subnet)
- RedShift (provisioned within the "DB" subnet),
- DAX clusters (provisioned within the "DB" subnet)
- Neptune clusters (provisioned with the "DB" subnet)
- Internet Access (if using a `NatGateway` or a `NatInstance`)

If your Lambda functions need to [access the internet](https://docs.aws.amazon.com/lambda/latest/dg/vpc.html#vpc-internet), then you _MUST_ provision `NatGateway` resources or a NAT instance.

By default, `AWS::EC2::VPCEndpoint` "Gateway" endpoints for S3 and DynamoDB will be provisioned within each availability zone to provide internal access to these services (there is no additional charge for using Gateway Type VPC endpoints). You can selectively control which `AWS::EC2::VPCEndpoint` "Interface" endpoints are available within your VPC using the `services` configuration option below. Not all AWS services are available in every region, so the plugin will query AWS to validate the services you have selected and notify you if any changes are required (there is an additional charge for using Interface Type VPC endpoints).

If you specify more then one availability zone, this plugin will also provision the following database-related resources (controlled using the `subnetGroups` plugin option):

- `AWS::RDS::DBSubnetGroup`
- `AWS::ElastiCache::SubnetGroup`
- `AWS::Redshift::ClusterSubnetGroup`
- `AWS::DAX::SubnetGroup`

to make it easier to create these resources across all of the availability zones.

## Installation

```
$ npx sls plugin install -n serverless-vpc-plugin
```

## Configuration

- All `vpcConfig` configuration parameters are optional

```yaml
# add in your serverless.yml

plugins:
  - serverless-vpc-plugin

provider:
  # you do not need to provide the "vpc" section as this plugin will populate it automatically
  vpc:
    securityGroupIds:
      -  # plugin will add LambdaExecutionSecurityGroup to this list
    subnetIds:
      -  # plugin will add the "Application" subnets to this list

custom:
  vpcConfig:
    cidrBlock: '10.0.0.0/16'

    # if createNatGateway is a boolean "true", a NAT Gateway and EIP will be provisioned in each zone
    # if createNatGateway is a number, that number of NAT Gateways will be provisioned
    createNatGateway: 2

    # When enabled, the DB subnet will only be accessible from the Application subnet
    # Both the Public and Application subnets will be accessible from 0.0.0.0/0
    createNetworkAcl: false

    # Whether to create the DB subnet
    createDbSubnet: true

    # Whether to enable VPC flow logging to an S3 bucket
    createFlowLogs: false

    # Whether to create a bastion host
    createBastionHost: false
    bastionHostKeyName: MyKey # required if creating a bastion host

    # Whether to create a NAT instance
    createNatInstance: false

    # Optionally specify AZs (defaults to auto-discover all availabile AZs)
    zones:
      - us-east-1a
      - us-east-1b
      - us-east-1c

    # By default, S3 and DynamoDB endpoints will be available within the VPC
    # see https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints.html
    # for a list of available service endpoints to provision within the VPC
    # (varies per region)
    services:
      - kms
      - secretsmanager

    # Optionally specify subnet groups to create. If not provided, subnet groups
    # for RDS, Redshift, ElasticCache and DAX will be provisioned.
    subnetGroups:
      - rds
        
    # Whether to export stack outputs so it may be consumed by other stacks 
    exportOutputs: false
```

## CloudFormation Outputs

After executing `serverless deploy`, the following CloudFormation Stack Outputs will be provided:

- `VPC`: VPC logical resource ID
- `LambdaExecutionSecurityGroup`: Security Group logical resource ID that the Lambda functions use when executing within the VPC
- `BastionSSHUser`: SSH username to access the bastion host, if provisioned
- `BastionEIP`: Elastic IP address associated to the bastion host, if provisioned
- `RDSSubnetGroup`: SubnetGroup associated to RDS, if provisioned 
- `ElastiCacheSubnetGroup`: SubnetGroup associated to ElastiCache, if provisioned
- `RedshiftSubnetGroup`: SubnetGroup associated to Redshift, if provisioned
- `DAXSubnetGroup`: SubnetGroup associated to DAX, if provisioned
- `AppSubnet{i}`: Each of the generated "Application" Subnets, where i is a 1 based index

### Exporting CloudFormation Outputs
Setting `exportOutputs: true` will export stack outputs.  
The name of the exported value will be prefixed by the cloud formation stack name (`AWS::StackName`).
For example, the value of the `VPC` output of a stack named `foo-prod` will be exported as `foo-prod-VPC`. 

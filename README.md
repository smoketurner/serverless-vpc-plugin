# serverless-vpc-plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-vpc-plugin.svg)](https://badge.fury.io/js/serverless-vpc-plugin)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/smoketurner/serverless-vpc-plugin/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/serverless-vpc-plugin.svg?style=flat)](https://www.npmjs.com/package/serverless-vpc-plugin)

Automatically creates an AWS Virtual Private Cloud (VPC) using all available Availability Zones (AZ) in a region.

This plugin provisions the following resources:

* `AWS::EC2::VPC`
* `AWS::EC2::InternetGateway` (for outbound internet access)
* `AWS::EC2::VPCGatewayAttachment` (to attach the `InternetGateway` to the VPC)
* `AWS::EC2::SecurityGroup` (to execute Lambda functions)

If the VPC is allocated a /16 subnet, each availability zone within the region will be allocated a /20 subnet. Within each availability zone, this plugin will further divide the subnets: 

* `AWS::EC2::Subnet` "Application" (/21) - default route is either `InternetGateway` or `NatGateway`
* `AWS::EC2::Subnet` "Public" (/22) - default route set `InternetGateway`
* `AWS::EC2::Subnet` "Database" (/22) - no default route set in routing table

The subnetting layout was heavily inspired by the now shutdown [Skyliner](https://skyliner.io) platform. 😞

Optionally, this plugin can also create `AWS::EC2::NatGateway` instances in each availability zone which requires provisioning `AWS::EC2::EIP` resources (AWS limits you to 5 per VPC, so if you want to provision your VPC across all 6 us-east availability zones, you'll need to request an VPC EIP limit increase from AWS).

Any Lambda functions executing with the "Application" subnet will only be able to access:
* S3 (via an S3 VPC endpoint)
* DynamoDB (via an DynamoDB VPC endpoint)
* RDS instances (provisioned within the "DB" subnet)
* ElastiCache instances (provisioned within the "DB" subnet)
* RedShift (provisioned within the "DB" subnet),
* DAX clusters (provisioned within the "DB" subnet)
* Neptune clusters (provisioned with the "DB" subnet)

If your Lambda functions need to access the internet, then you *MUST* provision `NatGateway` resources.

By default, `AWS::EC2::VPCEndpoint` "Gateway" endpoints for S3 and DynamoDB will be provisioned within each availability zone to provide internal access to these services (there is no additional charge for using Gateway Type VPC endpoints). You can selectively control which `AWS::EC2::VPCEndpoint` "Interface" endpoints are available within your VPC using the `services` configuration option below. Not all AWS services are available in every region, so the plugin will query AWS to validate the services you have selected and notify you if any changes are required (there is an additional charge for using Interface Type VPC endpoints).

If you specify more then one availability zone, this plugin will also provision the following database-related resources:

* `AWS::RDS::DBSubnetGroup`
* `AWS::ElastiCache::SubnetGroup`
* `AWS::Redshift::ClusterSubnetGroup`
* `AWS::DAX::SubnetGroup`

to make it easier to create these resources across all of the availability zones.

## Installation

```
$ npx sls plugin install -n serverless-vpc-plugin
```

## Configuration

* All `vpcConfig` configuration parameters are optional

```yaml
# add in your serverless.yml

plugins:
  - serverless-vpc-plugin

provider:
  vpc:
    securityGroupIds:
      - Ref: LambdaExecutionSecurityGroup # this plugin will create this security group for you
    subnetIds: # if specifying zones below, include the same number of subnets here
      - Ref: AppSubnet1
      - Ref: AppSubnet2
      - Ref: AppSubnet3
      #- Ref: AppSubnet4
      #- Ref: AppSubnet5
      #- Ref: AppSubnet6
  iamRoleStatements:
    - Effect: Allow
      Action:
        - 'ec2:CreateNetworkInterface'
        - 'ec2:DescribeNetworkInterfaces'
        - 'ec2:DetachNetworkInterface'
        - 'ec2:DeleteNetworkInterface'
      Resource: '*'

custom:
  vpcConfig:
    cidrBlock: '10.0.0.0/16'

    # if useNatGateway is a boolean "true", a NAT Gateway and EIP will be provisioned
    # in each zone auto-discovered or specified below.
    # if useNatGateway is a number, that number of NAT Gateways will be provisioned
    useNatGateway: 2

    # WORK IN PROGRESS
    #
    # TODO: with the current network ACLs in place, you are unable to invoke
    # the lambda from the AWS console
    #
    # Whether to create Network ACLs to restrict traffic between the subnets:
    # - Public <-> App = ALLOW
    # - App <-> DB = ALLOW
    # - Public <-> DB = DENY
    useNetworkAcl: false

    skipDbCreation: false # whether to skip creating the DBSubnet's
    zones: # optionally specify AZs (defaults to auto-discover all availabile AZs)
      - us-east-1a
      - us-east-1b
      - us-east-1c
    # by default, s3 and dynamodb endpoints will be available within the VPC
    # see https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints.html
    # for a list of available service endpoints to provision within the VPC
    # (varies per region)
    services:
      - kms
      - secretsmanager
```

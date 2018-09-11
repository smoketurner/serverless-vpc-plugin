# serverless-vpc-plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-vpc-plugin.svg)](https://badge.fury.io/js/serverless-vpc-plugin)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/smoketurner/serverless-vpc-plugin/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/serverless-vpc-plugin.svg?style=flat)](https://www.npmjs.com/package/serverless-vpc-plugin)

Automatically creates a VPC using all available Availability Zones in a region.

This plugin provisions the following resources:

* `AWS::EC2::VPC`
* `AWS::EC2::InternetGateway` (for outbound public internet access)
* `AWS::EC2::VPCGatewayAttachment` (to attach the `InternetGateway` to the VPC)
* `AWS::EC2::SecurityGroup` (to execute Lambda functions)

If the VPC is allocated a /16 subnet, each availability zone within the region will be allocated a /20 subnet. Within each availability zone, this plugin will further divide the subnets: 

* `AWS::EC2::Subnet` "Application" (/21) - default route is either `InternetGateway` or `NatGateway`
* `AWS::EC2::Subnet` "Public" (/22) - default route set `InternetGateway`
* `AWS::EC2::Subnet` "Database" (/22) - no default route set in routing table

Optionally, this plugin can also create `AWS::EC2::NatGateway` instances in each availability zone which requires provisioning `AWS::EC2::EIP` resources (AWS limits you to 5 per VPC).

Any Lambda functions executing with the "Application" subnet will only be able to access `S3` (via the S3 VPC endpoint), `DynamoDB` (via the DynamoDB VPC endpoint), `RDS` (provisioned within the "DB" subnet), `ElastiCache` (provisioned within the "DB" subnet), or `RedShift` (provisioned within the "DB" subnet). If your Lambda functions need to access any other AWS-resource or the Internet, then you *MUST* provision `NatGateway` resources.

This plugin will also provision the following database-related resources:

* `AWS::RDS::DBSubnetGroup`
* `AWS::ElastiCache::SubnetGroup`
* `AWS::Redshift::ClusterSubnetGroup`
* `AWS::EC2::VPCEndpoint` for S3
* `AWS::EC2::VPCEndpoint` for DynamoDB

to make it easier to create these resources across all of the availability zones.

## Installation

```
$ npm install --save-dev serverless-vpc-plugin
```

## Configuration

* All `vpcConfig` configuration parameters are optional

```
# add in your serverless.yml

plugins:
  - serverless-vpc-plugin

provider:
  vpc:
    securityGroupIds:
      - Ref: LambdaExecutionSecurityGroup
    subnetIds:
      - Ref: AppSubnet1
      - Ref: AppSubnet2
      - Ref: AppSubnet3
      - Ref: AppSubnet4
      - Ref: AppSubnet5
      - Ref: AppSubnet6
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
    useNatGateway: true
```

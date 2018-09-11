# serverless-plugin-vpc

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-plugin-vpc.svg)](https://badge.fury.io/js/serverless-plugin-vpc)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/smoketurner/serverless-plugin-vpc/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/serverless-plugin-vpc.svg?style=flat)](https://www.npmjs.com/package/serverless-plugin-vpc)

Automatically creates a VPC using all available Availability Zones the region specified in the serverless.yml configuration.

This plugin provisions the following resources:

* `AWS::EC2::VPC`
* `AWS::EC2::InternetGateway `(for outbound public internet access)
* `AWS::EC2::VPCGatewayAttachment` (to attach the IGW to the VPC)

If the VPC is allocated a /16 subnet, each availability zone within the region will be allocated a /20 subnet. Within each availability zone, this plugin will further divide the subnets: 

* "Application" `AWS::EC2::Subnet` (/21) - default route is either `InternetGateway` or `NatGateway`
* "Public" `AWS::EC2::Subnet` (/22) - default route set to `InternetGateway`
* "Database" `AWS::EC2::Subnet` (/22) - no default route set in routing table

Optionally, this plugin can also create `AWS::EC2::NatGateway` instances in each availability zone which requires provisioning `AWS::EC2::EIP` resources (AWS limits you to 5 per VPC).

This plugin will also provision the following database-related resources:

* `AWS::RDS::DBSubnetGroup`
* `AWS::ElastiCache::SubnetGroup`
* `AWS::Redshift::ClusterSubnetGroup`
* `AWS::EC2::VPCEndpoint` for S3
* `AWS::EC2::VPCEndpoint` for DynamoDB

to make it easier to create these resources across all of the availability zones.

## Installation

```
$ npm install --save-dev serverless-plugin-vpc
```

## Configuration

* All vpcConfig configuration parameters are optional

```
# add in your serverless.yml

plugins:
  - serverless-plugin-vpc

custom:
  vpcConfig:
    cidrBlock: '10.0.0.0/16'
    useNatGateway: true
```
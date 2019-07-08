const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  devtool: slsw.lib.webpack.isLocal ? 'eval-source-map' : false,
  externals: [nodeExternals()],
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
  module: {
    rules: [{ test: /\.pem$/, use: 'raw-loader' }],
  },
};

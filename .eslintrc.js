module.exports = {
  root: true,
  extends: ['airbnb-base', 'plugin:jest/recommended', 'plugin:prettier/recommended'],
  plugins: ['jest', 'prettier'],
  settings: {
    'import/core-modules': ['aws-sdk'],
  },
  rules: {
    'max-len': ['error', { code: 100, ignoreUrls: true }],
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
};

module.exports = {
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
    'plugin:prettier/recommended'
  ],
  plugins: ['jest'],
  env: {
    jest: true
  }
};

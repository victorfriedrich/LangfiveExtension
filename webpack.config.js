const path = require('path');

module.exports = {
  entry: './src/backgroundScript.ts',
  output: {
    filename: 'backgroundScript.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'webworker', // Important for service workers
  mode: 'production',
};

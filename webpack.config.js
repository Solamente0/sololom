const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
  entry: {
    background: './src/background/background.js',
    popup: './src/popup/popup.js',
    fullpage: './src/fullpage/fullpage.js',
    settings: './src/settings/settings.js',
    about: './src/about/about.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'assets', to: 'assets' },
        { from: 'LICENSE', to: '.' },
        { from: 'README.md', to: '.' }
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/fullpage/fullpage.html',
      filename: 'fullpage.html',
      chunks: ['fullpage']
    }),
    new HtmlWebpackPlugin({
      template: './src/settings/settings.html',
      filename: 'settings.html',
      chunks: ['settings']
    }),
    new HtmlWebpackPlugin({
      template: './src/about/about.html',
      filename: 'about.html',
      chunks: ['about']
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: 'vendor'
    }
  }
};

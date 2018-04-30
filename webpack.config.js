const webpack = require('webpack');

const path = require('path');

const nodeExternals = require('webpack-node-externals');

const config = {

  entry: {

      app: './routes/server.js'

  },

  output: {

    path: __dirname + "/public",

    filename: 'build/bundle.js'

  },

  module : {

    rules : [

      {

        test : /\.jsx?/,

        loader : 'babel-loader',

        exclude: /node_modules/,

        query: {

            "presets" : ["es2015", "react"]

          }

      }

    ]

  },

  target: 'node',

  externals: [nodeExternals({
    whitelist: ['express', 'mongodb', 'body-parser', 'react', 'react-dom', 'random-color']
  })]

};

module.exports = config;
const webpack = require('webpack');

const path = require('path');

const config = {

  entry: {

      app: './routes/index.js'

  },

  output: {

    path: __dirname + "/public",

    filename: 'build/bundle.js'

  },

  module : {

    loaders : [

      {

        test : /\.jsx?/,

        loader : 'babel-loader',

        exclude: '/node_modules',

        query: {

            "presets" : ["es2015", "react"]

          }

      }

    ]

  }

};



module.exports = config;
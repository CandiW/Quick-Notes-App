Module.exports = {
  Entry: "./routes/server.js",
  Output: {
    Path: __dirname + "/public",
    Filename: 'bundle.js'
  },
  Module: {
    Loaders: [
      {
        Test: /\.js$/,
        Loader: 'babel-loader'
      }
    ]
  }
};

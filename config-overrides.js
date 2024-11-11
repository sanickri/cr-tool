const path = require('path')
const webpack = require('webpack')	

module.exports = function override(config) {
	config.resolve.fallback = {
		...config.resolve.fallback,
		"path": require.resolve("path-browserify"),
		"os": require.resolve("os-browserify/browser"),
		"crypto": require.resolve("crypto-browserify"),
		"buffer": require.resolve("buffer/"),
		"stream": require.resolve("stream-browserify"),
		"vm": require.resolve("vm-browserify"),
		"process": require.resolve("process/browser"),
	}	
	config.plugins = (config.plugins || []).concat([
		new webpack.ProvidePlugin({
		  process: 'process/browser',
		  Buffer: ['buffer', 'Buffer'],
		}),
	  ])
	return config	
}	
const path = require('path');
const fs = require('node:fs');

const entryPoints = Object.fromEntries( fs.globSync('./src/js/**/index.js').map(entry=>[
	entry.replace(/^src\/js\//,'').replace(/\/index.js$/,''),
	`./${entry}`
]) )

module.exports = {
	entry: entryPoints,
	resolve: {
		modules: [
			path.resolve(__dirname, 'node_modules'),
			path.resolve(__dirname, 'src/js/lib'),
		]
	},
	externals: {
		jquery: "jQuery",
		backbone: "Backbone",
		undersore: "Underscore"
	},
	devtool: 'source-map'
};

const release = require('./lib/release/index.js');

const identifier =  ['major','minor','patch'].indexOf(process.argv[ process.argv.length - 1 ]) !== -1
	? process.argv[ process.argv.length - 1 ]
	: 'patch';

const dry = process.argv.indexOf('dry') !== -1;

(async () => {
	if ( process.argv.indexOf('build') !== -1 ) {
		console.log('## BUILD ##')
		await release.build( identifier )
	}
	if ( process.argv.indexOf('github') !== -1 ) {
		console.log('## GITHUB ##')
		await release.github(dry)
	}
	if ( process.argv.indexOf('bitbucket') !== -1 ) {
		console.log('## BITBUCKET ##')
		await release.bitbucket(dry)
	}
	if ( process.argv.indexOf('wporg') !== -1 ) {
		console.log('## WPORG ##')
		await release.wporg(dry)
	}
})();

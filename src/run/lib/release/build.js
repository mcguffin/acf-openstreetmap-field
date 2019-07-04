/*
Set version numbers in all relevant files, commits and pushes
*/

// versioning
const semver = require('semver');
const wp = require('../wp-release.js');
const fs = require('fs');
const glob = require('glob');


module.exports = ( identifier = null ) => {
	return new Promise( (resolve,reject) => {
		// buuilding
		const localGulp = require('../../../../gulpfile.js');
		// repo
		if ( null === identifier ) {
			identifier =  ['major','minor','patch'].indexOf(process.argv[ process.argv.length - 1 ]) !== -1
				? process.argv[ process.argv.length - 1 ]
				: 'patch';
		}
		const git = require('simple-git')('.');
		let branch;

		let package = require('../../../../package.json'); // relative to this dir ...

		if ( ['major','minor','patch'].indexOf(identifier) === -1 ) {
			reject( "Invalid version identifier. Must be one of  ['major','minor','patch']");
		}

		const package_name = wp.get_package_name();
		const version = semver.inc( package.version, identifier )

		/**
		 *	Increment Version number in affected files
		 */
		// update package.json
		package.version = version;
		fs.writeFileSync( 'package.json', JSON.stringify( package, null, 2 ) ); // relative to process.cwd()

		// update wp plugin/theme files
		wp.get_header_files().forEach(file => {
			wp.write_header_tag(file,'Version',version);
		});
		// updte readme
		wp.write_header_tag('readme.txt','Stable tag',version);

		// update *.pot
		glob.sync('languages/*.pot').forEach( file => {
			let content = fs.readFileSync( file, { encoding: 'utf8' } );
			// "Project-Id-Version: Serial 0.0.4\n"

			content = content.replace(
				/(Project-Id-Version:\s)(.*)(\\n)/im,
				'$1'+ package_name + ' ' + version +'$3'
			);
			fs.writeFileSync(file,content)
		});


		/**
		 *	Build assets then commit
		 */
		localGulp.build( () => {
			git.branch( (err,res) => {
				branch = res.current;
				// ... add and commit
				git
					.add('.')
					.commit(`Release ${version} from ${branch}`)
					.exec( resolve )
			});
		});
	} )
}

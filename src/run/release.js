/*
Set version numbers in all relevant files, commits and pushes
*/

// versioning
const semver = require('semver');
const wp = require('./lib/wp-release.js');
const fs = require('fs');
const glob = require('glob');

// buuilding
const localGulp = require('../../gulpfile.js');

// repo
const git = require('simple-git')('.');
let branch;


let package = require('../../package.json'); // relative to this dir ...

const identifier = process.argv.length > 2 ? process.argv[2] : 'patch';
if ( ['major','minor','patch'].indexOf(identifier) === -1 ) {
	throw "Invalid version identifier. Must be one of  ['major','minor','patch']";
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
	});
});

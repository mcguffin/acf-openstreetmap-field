const fs = require('fs');
const exec = require('child_process');
const wp = require('./lib/wp-release.js');

//
let svn_user = null;
let svn_version;
let commit_message;

const contributors = wp.read_header_tag('readme.txt','Contributors').split(',');

contributors.forEach( nickname => {
	let result;
	try {
		svn_user = exec.execSync(
			`security find-generic-password -s "<https://plugins.svn.wordpress.org:443> Use your WordPress.org login" -a ${nickname} -w`,
			{ encoding:'utf8' }
		).replace(/\n$/g,'');

	} catch (err) {}
})

if ( null === svn_user ) {
	throw('couldn\'t detect svn user');
}

const package = require('../../package.json');
const svn_dir = 'tmp/svn';
const git_dir = 'tmp/git';
const svn_url = `https://plugins.svn.wordpress.org/${package.name}/`;


console.log('Setup')
exec.execSync(`mkdir -p ${svn_dir}/`);
exec.execSync(`mkdir -p ${git_dir}/`);
console.log('...done')

console.log('Gather Plugin')
exec.execSync(`git archive HEAD | tar x --directory="${git_dir}/"`);
console.log('...done')

console.log('Fetch SVN')
exec.execSync(`svn checkout --depth immediates "${svn_url}" "${svn_dir}"`)
console.log(exec.execSync('svn update --set-depth infinity assets',{
	cwd:svn_dir,
	encoding:'utf8',
}))
console.log(exec.execSync('svn update --set-depth infinity trunk',{
	cwd:svn_dir,
	encoding:'utf8',
}))
console.log('...done')

svn_version = wp.read_header_tag(`${svn_dir}/trunk/readme.txt`,'Stable tag')

console.log('Update SVN')
exec.execSync(`rsync -rc "${git_dir}/" ${svn_dir}/trunk/ --delete`)
exec.execSync(`rsync -rc ".wporg/" ${svn_dir}/assets/ --delete`)

exec.execSync('svn add . --force',{
	cwd:'./'+svn_dir,
})
exec.execSync('svn status | grep \'^!\' | sed \'s/! *//\' | xargs -I% svn rm %',{
	cwd:'./'+svn_dir,
})
console.log('...done')

//
if ( svn_version !== package.version ) {
	console.log( `Create SVN Tag: tags/${package.version}` )
	exec.execSync(`svn cp "trunk" "tags/${package.version}"`,{
		cwd:svn_dir,
	})
	commit_message = `Release ${package.version}`;
	console.log('...done')
} else {
	commit_message = `Update trunk`;
}

console.log('SVN Status:')
console.log(exec.execSync('svn status',{
	encoding:'utf8',
	cwd:svn_dir,
}));


console.log('Committing...')
console.log(exec.execSync(`svn commit -m "${commit_message}" --non-interactive`,{
	encoding:'utf8',
	cwd:svn_dir,
}))
console.log('...done')


console.log('Cleaning up')
exec.execSync('rm -rf tmp');
console.log('...done')


console.log('All done!')

// 1. checkout remote
// 2. git archive to trunk
// 3. svn handle delta
// 4. svn cp trunk tags/version
// 5. svn ci

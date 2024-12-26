const colors = require('colors');
const { execSync } = require('child_process');
const { extname } = require('path');
const { watch, globSync }   = require('fs');

const isWatch = ['--watch'].find( el => process.argv.indexOf(el) !== -1 );

const lint = file => {
	// const opt = { stdio: ['pipe',process.stderr,process.stderr], encoding: 'UTF-8' }
	const l = ({
		".json": file => execSync( `jsonlint ./${file}`, { encoding: 'UTF-8' } ),
		".php": file => execSync( `php -d display_errors=1 -l ./${file} > /dev/null`, { encoding: 'UTF-8' } ),
	})[extname(file)];
	try {
		l && console.log(`linting ./${file}`.bold.green)
		l(file)
	} catch(err){
		return true
	}
	return false
}

if ( isWatch ) {
	watch('.',{
		persistent: true,
		recursive: true
	},(eventType,file) => ('change' === eventType) && lint(file) )
} else {
	const len = globSync('./**/*.{php,json}')
		.filter( file => false === /^(vendor|node_modules)\//.test(file) )
		.map( lint )
		.filter( el => !!el )
		.length
	if ( len ) {
		console.log(`linting failed`.red.bold)
		process.exit(1)
	}
}

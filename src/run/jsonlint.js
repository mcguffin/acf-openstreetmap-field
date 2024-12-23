const exec = require('child_process');
const fs = require('fs');

const [ , , ...args ] = process.argv;
console.log(args)
fs.globSync(args[0]).map( el => {
	try {
		exec.execSync( `jsonlint ./${el}`)
	} catch(err) {
		// console.log(typeof err)
	}
})

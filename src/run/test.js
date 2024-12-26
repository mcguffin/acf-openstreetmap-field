const fs = require('fs');

const line = `
include_once __DIR__ . DIRECTORY_SEPARATOR . 'test/test.php';`;


const reset = filepath => {
	let content = fs.readFileSync(filepath, {encoding:'UTF-8'});
	content = content.replace(line,'');
	return content;
}

if ( process.argv.includes('start') ) {
	// append line to plugin main file
	content = reset( './index.php' );
	content += line;
	fs.writeFileSync( './index.php', content )
//	let content =
}
if ( process.argv.includes('stop') ) {
	// remove line from plugin main file
	content = reset( './index.php' );
	fs.writeFileSync( './index.php', content )
}

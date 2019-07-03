const fs = require('fs');

let strings;


const extract_strings = ( obj, mapping ) => {
	for ( var s in obj ) {
		// omit empty strings
		if ( '' === obj[s] ) {
			continue;
		}
		// apply custom mapping rules
		if ( s in mapping ) {
			mapping[s]( s, obj[s] );
		} else if ( 'object' === typeof obj[s] ) {
			// recurse objects
			extract_strings( obj[s], mapping );
		}
	}
}

const parse_files = ( files, mapping, str = [] ) =>  {
	strings = str;
	files.forEach( (file) => {
		let data = fs.readFileSync(file);
		data = JSON.parse(data);
		extract_strings( data, mapping )
	});
	return strings.filter(function(value, index, self) {
		return self.indexOf(value) === index;
	});
}

const generate_php = ( outfile, strings, textdomain ) => {
	let php = '';
	php += '<?php\n';
	php += '/* Generated file - do not edit */\n';
	php += 'exit(0);\n';
	php += '\n';

	for ( i=0; i < strings.length; i++ ) {
		php += "__( '"+strings[i]+"', '"+textdomain+"');";
		php += '\n';
	}
	fs.writeFile( outfile, php, ()=>{} );
}

xt = module.exports = {
	parse_files,
	generate_php,
	map_string:(k,v) => {
		// this: mapping object
		strings.push( v );
	},
	map_values:(k,v) => {
		// v is object
		let ko;
		for ( ko in v ) {
			xt.map_string(ko,v[ko])
		}
	}
}

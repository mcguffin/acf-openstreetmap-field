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
		try {
			data = JSON.parse(data);
		} catch {
			throw "Invalid JSON in "+file
		}
		extract_strings( data, mapping )
	});
	return strings.filter(function(value, index, self) {
		return self.indexOf(value) === index;
	});
}


const generate_php_lines = ( strings, textdomain, context = false ) => {
	let php = '', str;
	for ( i=0; i < strings.length; i++ ) {
		str = strings[i].replaceAll('\'','\\\'')
		if ( false !== context ) {
			php += "_x( '"+str+"', '"+context+"', '"+textdomain+"');";
		} else {
			php += "__( '"+str+"', '"+textdomain+"');";
		}
		php += '\n';
	}
	return php;
}



const generate_php = ( outfile, strings, textdomain, context = false ) => {
	let php = '';
	php += '<?php\n';
	php += '/* Generated file - do not edit */\n';
	php += '\n';
	php += generate_php_lines( strings, textdomain, context )
	fs.writeFileSync( outfile, php );
}

xt = module.exports = {
	parse_files,
	generate_php,
	generate_php_lines,
	map_string:(k,v) => {
		// this: mapping object
		//v = v.replace(/\r\n/,"\n")

		if ( 'string' === typeof v ) {
			strings.push( v.replace(/\r\n/g,'\n') );
		}
	},
	map_values:(k,v) => {
		// v is object
		let ko;
		for ( ko in v ) {
			if ( 'string' === typeof v[ko] ) {
				xt.map_string(ko,v[ko])
			} else {
				xt.map_string(ko,ko)
				xt.map_values(ko,v[ko])
			}
		}
	}
}

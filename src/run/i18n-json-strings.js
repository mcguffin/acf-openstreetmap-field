// rm -f languages/*.json
const fs = require('fs')
const xt = require('./lib/json-extract.js');
const package = require( '../../package.json' );


let php = '';

const common_mapping = {
	label:       xt.map_string,
}

// acf
strings = [];

php += '<?php\n';
php += '/* Generated file - do not edit */\n';
php += '\n';
php += xt.generate_php_lines(
	xt.parse_files( fs.globSync('./etc/leaflet-control-geocoders.json'), common_mapping, [] ),
	package.name,
	'geocoder'
)

fs.writeFileSync( './src/php/json-strings.php', php );

const fs			= require( 'fs' );
const gulp			= require( 'gulp' );
const glob			= require( 'glob' );
const autoprefixer	= require( 'gulp-autoprefixer' );
const browserify	= require( 'browserify' );
const babelify		= require( 'babelify' );
/*
const sass			= require( 'gulp-sass' );
/*/
const sass			= require('gulp-sass')( require('sass') );
//*/
const source		= require( 'vinyl-source-stream' );
const sourcemaps	= require( 'gulp-sourcemaps' );
const es			= require( 'event-stream' );
const child_process	= require( 'child_process' );

const package = require( './package.json' );

const uglify = require('uglify-js');

let bundlemap = {};

const onFile = (target) => function( file, id, parent ) {

	let f = file.replace( __dirname + '/','')
	// ignore external deps!
	if ( f.indexOf('node_modules/') === 0 ) {
		return;
	}
	if ( ! bundlemap[ f ] ) {
		bundlemap[ f ] = [];
	}
	bundlemap[ f ].push('js/'+target)
}
const onPackage = function(bundle) {
	// extract from
	Object.keys(bundlemap).forEach(src => {
		//  distinct
		bundlemap[src] = bundlemap[src].filter( ( val, idx, self ) => self.indexOf( val ) === idx )
	})
	fs.writeFileSync( './src/js/bundlemap.json',JSON.stringify( bundlemap, null, 2 ), {encoding:'utf-8'});
}

const config = {
	sass : {
		outputStyle: 'compressed',
		precision: 8,
		stopOnError: false,
		functions: {
			'base64Encode($string)': $string => {
				var buffer = new Buffer( $string.getValue() );
				return sass.types.String( buffer.toString('base64') );
			}
		},
		includePaths:[ 'src/scss/', 'node_modules/' ],
		watchPaths: './src/scss/**/*.scss'
	},
	js: {
		exclude:[
			'./src/js/lib/'
		]
	},
	destPath: e => {
		return e.extname.replace( /^\./, './assets/' );
	}
}


gulp.task('i18n:fix-pot', cb => {
	try {
		bundlemap = require( './src/js/bundlemap.json')
		glob.sync('./languages/*.po*')
			.map( entry => {
				let contents = fs.readFileSync( entry, { encoding: 'utf-8' } );
				Object.keys(bundlemap).forEach( src => {
					// replace source with destinations
					let replace = '';
					let search = RegExp( '#:\\s'+ src.replace('.','\\.') + ':(\\d+)\n', 'g' );
					bundlemap[src].forEach( dest => {
						replace += '#: ' + dest + "\n";
					} );
					contents = contents.replace( search, replace ).replace( replace+replace,replace);
				} );
				// remove leftovers

		//		contents = contents.replace( /#:\ssrc\/js(.+)\.js:(\d+)\n/g, '' );
				fs.writeFileSync( entry, contents, { encoding: 'utf-8' } );
			} )
	} catch(err) {};
	cb();
});
gulp.task('i18n:make-pot',cb => {
	child_process.execSync(`wp i18n make-pot . languages/${package.name}.pot --domain=${package.name} --include=src/js/*.js,*.php --exclude=*.*`);
	cb();
})
gulp.task('i18n:make-json',cb => {
	// rm -f languages/*.json
	glob.sync('./languages/*.json').map( fs.unlinkSync );
	glob.sync('./languages/*.po').length && child_process.execSync( "wp i18n make-json languages/*.po --no-purge" );
	cb();
});



function js_task(debug) {
	return cb => {
		let tasks = glob.sync("./src/js/**/index.js")
			.filter( p => ! config.js.exclude.find( ex => p.indexOf(ex) !== -1 ) )
			.map( entry => {
				let target = entry.replace(/(\.\/src\/js\/|\/index)/g,'');
				return browserify({
				        entries: [entry],
						debug: debug, // <== big and slow and ugly!
						paths:['./src/js/lib']
				    })
					.transform( babelify.configure({}) )
					.transform( 'browserify-shim' )
					.plugin('tinyify')
					.on( 'file', onFile(target) )
					.on( 'package', onPackage )
					.bundle()
					.pipe(source(target))
					.pipe( gulp.dest( config.destPath ) );
			} );

		return es.merge(tasks).on('end',cb)
	}
}
function scss_task(debug) {
	return cb => {
		let g = gulp.src( config.sass.watchPaths ); // fuck gulp 4 sourcemaps!
		if ( debug ) { // lets keep ye olde traditions
			g = g.pipe( sourcemaps.init( ) )
		}
		g = g.pipe(
			sass( config.sass )
		)
		.pipe( autoprefixer( { browsers: package.browserlist } ) );
		if ( debug ) {
			g = g.pipe( sourcemaps.write( ) )
		}
		return g.pipe( gulp.dest( config.destPath ) );
	}
}




gulp.task( 'js-legacy:frontend', function(cb) {
	let js = [
		'./node_modules/resize-observer-polyfill/dist/ResizeObserver.js',
		'./node_modules/leaflet/dist/leaflet-src.js',
		'./node_modules/leaflet-control-geocoder/dist/Control.Geocoder.js',
		'./node_modules/leaflet-providers/leaflet-providers.js',
		'./node_modules/leaflet.locatecontrol/src/L.Control.Locate.js',
		'./src/js-legacy/acf-osm-frontend.js',
	].map( function(file) {
		return fs.readFileSync( file, { encoding: 'utf-8' } )
	} ).join("\n");

	let output = 'assets/legacy/js/acf-osm-frontend'

	fs.writeFileSync( output + '.js', js, { encoding: 'utf-8' } )
	js = uglify.minify(js).code
	fs.writeFileSync( output + '.min.js', js, { encoding: 'utf-8' } )
	cb();

} );




gulp.task('build:js', js_task( false ) );
gulp.task('build:scss', scss_task( false ) );

gulp.task('dev:js', js_task( true ) );
gulp.task('dev:scss', scss_task( true ) );


gulp.task('watch', cb => {
	gulp.watch( config.sass.watchPaths,gulp.parallel('dev:scss'));
	gulp.watch('./src/js/**/*.js',gulp.parallel('dev:js'));
	gulp.watch('./src/js-legacy/**/*.js',gulp.parallel('js-legacy:frontend'));
	gulp.watch('./languages/*.pot',gulp.parallel('i18n:fix-pot'));
	gulp.watch('./languages/*.po',gulp.parallel('i18n:make-json'));
});

gulp.task('dev',gulp.series('dev:scss','dev:js','watch'));

gulp.task('i18n', gulp.series( 'i18n:make-pot','i18n:fix-pot','i18n:make-json'));

gulp.task('build', gulp.series('build:js','build:scss', 'i18n', 'js-legacy:frontend' ));

gulp.task('default',cb => {
	console.log('run either `gulp build` or `gulp dev`');
	cb();
});

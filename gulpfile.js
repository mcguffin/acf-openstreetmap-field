const fs			= require( 'fs' );
const gulp			= require( 'gulp' );
const glob			= require( 'glob' );
const autoprefixer	= require( 'gulp-autoprefixer' );
const browserify	= require( 'browserify' );
const babelify		= require( 'babelify' );
const buffer		= require( 'vinyl-buffer' );
const sass			= require( 'gulp-sass' )( require('sass') );
const source		= require( 'vinyl-source-stream' );
const sourcemaps	= require( 'gulp-sourcemaps' );
const es			= require( 'event-stream' );
const child_process	= require( 'child_process' );

const package       = require( './package.json' );

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
		includePaths:[
			'./node_modules/',
			'./src/scss/',
		],
		watchPaths: './src/scss/**/*.scss',
		// importers:[]
	},
	js: {
		exclude:[
			'./src/js/lib/'
		]
	},
	destPath: './assets'
}


function js_task(debug) {
	return cb => {
		let tasks = glob.sync("./src/js/**/index.js")
			.filter( p => ! config.js.exclude.find( ex => p.indexOf(ex) !== -1 ) )
			.map( entry => {
				let target = entry.replace(/(\.\/src\/js\/|\/index)/g,'');
				return browserify({
						entries: [entry],
						debug: debug,
						paths:['./src/js']
					})
					.transform( babelify.configure({}) )
					.transform( 'browserify-shim' )
					.plugin('tinyify')
					.bundle()
					.on('error', console.log)
					.pipe(source(target))
					.pipe(buffer())
					.pipe(sourcemaps.init({loadMaps: true}))
					// .pipe(uglify())
					.pipe(sourcemaps.write(`./`))
					.pipe( gulp.dest( `${config.destPath}/js` ) );
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
			g = g.pipe( sourcemaps.write( '.' ) )
		}
		return g.pipe( gulp.dest( `${config.destPath}/css` ) );
	}
}







gulp.task('build:js', js_task( false ) );
gulp.task('build:scss', scss_task( false ) );

gulp.task('dev:js', js_task( true ) );
gulp.task('dev:scss', scss_task( true ) );

gulp.task('watch:scss',cb => {
	cb()
});

gulp.task('build',gulp.series('build:scss','build:js'));

gulp.task('watch', cb => {
	gulp.watch( config.sass.watchPaths, gulp.parallel('dev:scss','watch:scss'));
	gulp.watch('./src/js/**/*.js',gulp.parallel('dev:js'));
});

gulp.task('dev',gulp.series('dev:scss','dev:js','watch'));


//
//
// function do_scss( src ) {
// 	var dir = src.substring( 0, src.lastIndexOf('/') ),
// 		includePaths = ['src/scss/','node_modules/'];
// 	return gulp.src( './src/scss/' + src + '.scss' )
// 		.pipe( sourcemaps.init() )
// 		.pipe( sass( { includePaths } ).on('error', sass.logError) )
// 		.pipe( autoprefixer({
//
// 		}) )
// 		.pipe( gulp.dest( './assets/css/' + dir ) )
//         .pipe( sass( { outputStyle: 'compressed', includePaths } ).on('error', sass.logError) )
// 		.pipe( rename( { suffix: '.min' } ) )
//         .pipe( sourcemaps.write() )
//         .pipe( gulp.dest( './assets/css/' + dir ) );
//
// }
//
// function do_js( src ) {
// 	var dir = src.substring( 0, src.lastIndexOf('/') );
// 	return gulp.src( './src/js/' + src + '.js' )
// 		.pipe( sourcemaps.init() )
// 		.pipe( gulp.dest( './assets/js/' + dir ) )
// 		.pipe( uglify() )
// 		.pipe( rename( { suffix: '.min' } ) )
// 		.pipe( sourcemaps.write() )
// 		.pipe( gulp.dest( './assets/js/' + dir ) );
// }
//
// function concat_js( src, dest ) {
// 	return gulp.src( src )
// 		.pipe( sourcemaps.init() )
// 		.pipe( concat( dest ) )
// 		.pipe( sourcemaps.write() )
// 		.pipe( gulp.dest( './assets/js/' ) )
// 		.pipe( uglify() )
// 		.pipe( rename( { suffix: '.min' } ) )
// 		.pipe( gulp.dest( './assets/js/' ) );
// }
//
//
// // fake leaflet
// L = {
// 	TileLayer: {
// 		extend: function(o) {
// 			for ( var s in o )
// 				L.TileLayer[s] = o[s];
// 			return L.TileLayer;
// 		},
// //		Provider:{}
// 	},
// 	tileLayer:{}
// }
//
// // write providers data to ./etc
// gulp.task('providers', function(cb){
// 	require('./node_modules/leaflet-providers/leaflet-providers.js');
// 	let providers = L.TileLayer.Provider.providers;
//
// 	// add overlay property to maps and layers
// 	const isOverlay = ( name, opts ) => {
// 		if ( 'string' !== typeof opts && opts.opacity && opts.opacity < 1 ) {
// 			return true;
// 		}
// 		let overlayPattern = [
// 			'^(OpenWeatherMap|OpenSeaMap)',
// 			'OpenMapSurfer.(Hybrid|AdminBounds|ContourLines|Hillshade|ElementsAtRisk)',
// 			// 'HikeBike.HillShading',
// 			'Stamen.(Toner|Terrain)(Hybrid|Lines|Labels)',
// 			'TomTom.(Hybrid|Labels)',
// 			'Hydda.RoadsAndLabels',
// 			'^JusticeMap',
// 			'OpenPtMap',
// 			'OpenRailwayMap',
// 			'OpenFireMap',
// 			'SafeCast',
// 			'OnlyLabels',
// 			'HERE(v3?).trafficFlow',
// 			'HERE(v3?).mapLabels',
// 			'WaymarkedTrails'
// 		].join('|');
//
// 		return name.match( overlayPattern ) !== null;
// 	}
//
// 	// HEREv3 manual upgrade until https://github.com/leaflet-extras/leaflet-providers/pull/343 is released
// 	// L.TileLayer.Provider.providers.HEREv3 = JSON.parse(JSON.stringify(L.TileLayer.Provider.providers.HERE))
// 	// L.TileLayer.Provider.providers.HEREv3.url = "https://{s}.{base}.maps.ls.hereapi.com/maptile/2.1/{type}/{mapID}/{variant}/{z}/{x}/{y}/{size}/{format}?apiKey={apiKey}&lg={language}";
// 	// L.TileLayer.Provider.providers.HEREv3.options.apiKey = "<insert your apiKey here>";
// 	// delete( L.TileLayer.Provider.providers.HEREv3.options.app_code )
// 	// delete( L.TileLayer.Provider.providers.HEREv3.options.app_id )
//
// 	 // 52d2aca6-c3b6-4c59-b9de-5df4f4d056bd
//
// 	 delete( L.TileLayer.Provider.providers.USGS ) // Remove, lots of 404s
//
// 	 // missing default variants, will break JS
// 	 L.TileLayer.Provider.providers.JusticeMap.options.variant = 'income'
// 	 L.TileLayer.Provider.providers.WaymarkedTrails.options.variant = 'hiking'
// 	 L.TileLayer.Provider.providers.NASAGIBS.options.variant = 'MODIS_Terra_CorrectedReflectance_TrueColor'
// 	 L.TileLayer.Provider.providers.nlmaps.options.variant = 'brtachtergrondkaart'
//
// 	 // delete seemingly broken stamen variants
// 	 delete( L.TileLayer.Provider.providers.Stamen.variants.TopOSMRelief);
// 	 delete( L.TileLayer.Provider.providers.Stamen.variants.TopOSMFeatures);
//
// 	 // remove HikeBike #83
// 	 delete( L.TileLayer.Provider.providers.HikeBike );
//
//
// /*
// 	// add MAPBOX ids as variant. See https://www.mapbox.com/api-documentation/#maps
// 	let mapbox_variants = [
// 		'streets',
// 		'light',
// 		'dark',
// 		'satellite',
// 		'streets-satellite',
// 		'wheatpaste',
// 		'streets-basic',
// 		'comic',
// 		'outdoors',
// 		'run-bike-hike',
// 		'pencil',
// 		'pirates',
// 		'emerald',
// 		'high-contrast',
// 	];
// 	L.TileLayer.Provider.providers.MapBox.variants = {};
// 	mapbox_variants.forEach( variant => {
// 		var key;
// 		key = variant.replace(/^(.)|[\s-_\.]+(.)/g, function ($1) {
// 			return $1.toUpperCase()
// 		})
// 		key = key.replace( /\s\r\n\v\.-_/, '' );
// 		L.TileLayer.Provider.providers.MapBox.variants[ key ] = 'mapbox.'+variant;
// 	} )
// 	L.TileLayer.Provider.providers.MapBox.url = L.TileLayer.Provider.providers.MapBox.url.
// 		replace('{id}','{variant}');
// 	L.TileLayer.Provider.providers.MapBox.options.variant = 'mapbox.streets';
//
// 	// remove falsy configuration
// 	delete( L.TileLayer.Provider.providers.MapBox.options.id );
// 	// END mapbox
// */
// 	// add overlay property to maps and layers
// 	Object.keys(providers).map( key => {
// 		let data = providers[key];
// 		if ( isOverlay( key, data ) ) {
// 			data.isOverlay = true;
// 		} else if ( !! data.variants ) {
// 			Object.keys(data.variants).map( vkey => {
// 				let variant = data.variants[vkey];
// 				if ( 'string' === typeof variant ) {
// 					variant = {
// 						options: {
// 							variant: variant
// 						}
// 					}
// 				}
// 				if ( isOverlay( `${key}.${vkey}`, variant ) ) {
// 					variant.isOverlay = true;
// 				}
// 				data.variants[vkey] = variant
// 			});
// 		}
// 		// if ( data.options.opacity && data.options.opacity < 1 ) {
// 		// 	data.isOverlay = true;
// 		// } else if ( !! data.variants ) {
// 		// 	Object.keys(data.variants).map( vkey => {
// 		// 		let variant = data.variants[vkey];
// 		// 		if ( 'string' === typeof variant ) {
// 		// 			return;
// 		// 		}
// 		// 		if ( variant.options && variant.options.opacity && variant.options.opacity < 1 ) {
// 		// 			data.variants[vkey].isOverlay = true;
// 		// 		} else if ( `${key}.${vkey}`.match( overlayPattern ) !== null ) {
// 		// 			data.variants[vkey].isOverlay = true;
// 		// 		}
// 		// 	} )
// 		// } else if ( key.match( overlayPattern ) !== null ) {
// 		// 	data.isOverlay = true;
// 		// }
// 		providers[key] = data;
// 	} );
// 	return fs.writeFile( './etc/leaflet-providers.json', JSON.stringify( providers, null, '\t' ), cb );
// });
//
//
//
// gulp.task('scss:edit', function() {
// 	return do_scss('acf-input-osm');
// });
//
//
// gulp.task('scss:settings', function() {
// 	return do_scss('acf-osm-settings');
// });
// gulp.task('scss', gulp.parallel('scss:edit','scss:settings'));
//
// gulp.task('leaflet-css', gulp.parallel(
// 		function() {
// 			// frontend
// 			return gulp.src([
// 				'./node_modules/leaflet/dist/leaflet.css',
// 				'./node_modules/leaflet-control-geocoder/dist/Control.Geocoder.css',
// 			])
// 				.pipe( concat('./assets/css/') )
// 				.pipe( rename('leaflet.css') )
// 				.pipe( gulp.dest( './assets/css/' ) )
// 				.pipe( uglifycss() )
// 				.pipe( rename( { suffix: '.min' } ) )
// 				.pipe( gulp.dest( './assets/css/' ) );
// 		},
// 		function() {
// 			// copy images to css
// 			return gulp.src([
// 				'./node_modules/leaflet/dist/images/*.svg',
// 				'./node_modules/leaflet/dist/images/*.png',
// 				// './node_modules/leaflet-minimap/dist/images/*.png',
// 				'./node_modules/leaflet-control-geocoder/dist/images/*.gif',
// 				'./node_modules/leaflet-control-geocoder/dist/images/*.png',
// 				'./node_modules/leaflet-control-geocoder/dist/images/*.png',
// 			])
// 				.pipe( gulp.dest( './assets/css/images/' ) );
// 		},
// 		function() {
// 			return gulp.src([
// 				'./node_modules/leaflet.locatecontrol/*.svg',
// 			])
// 				.pipe( gulp.dest( './assets/' ) );
// 		}
//
// 	)
// );
//
//
//
//
// gulp.task('js-field-group', function() {
//     return concat_js( [
// 			'./src/js/acf-field-group-osm.js',
// 		], 'acf-field-group-osm.js');
// });
//
// gulp.task('js-admin', function() {
//     return concat_js( [
// 			'./src/js/acf-input-osm.js',
// 		], 'acf-input-osm.js');
// });
//
//
// gulp.task( 'js-frontend', function(){
// 	return concat_js( [
// 			'./node_modules/resize-observer-polyfill/dist/ResizeObserver.js',
// 			'./node_modules/leaflet/dist/leaflet-src.js',
// 			'./node_modules/leaflet-control-geocoder/dist/Control.Geocoder.js',
// 			'./node_modules/leaflet-providers/leaflet-providers.js',
// 			'./node_modules/leaflet.locatecontrol/src/L.Control.Locate.js',
// 			'./src/js/acf-osm-frontend.js',
//
// 		], 'acf-osm-frontend.js');
// } );
//
//
// gulp.task('js-settings', function() {
//     return concat_js( [
// 			'./src/js/acf-osm-settings.js',
// 		], 'acf-osm-settings.js');
// });
//
//
// gulp.task('js', gulp.parallel('js-frontend','js-admin','js-field-group','js-settings') );
//
// gulp.task('pre-build', gulp.parallel('providers','leaflet-css') );
//
// gulp.task('build', gulp.parallel('pre-build','scss','js') );
//
//
// gulp.task('watch', function() {
// 	// place code for your default task here
// 	gulp.watch('./src/scss/**/*.scss',	gulp.parallel( 'scss' ) );
// 	gulp.watch('./src/js/**/*.js',		gulp.parallel( 'js' ) );
// });
//
// gulp.task( 'dev', gulp.series('pre-build', 'build', 'watch') );
//
// gulp.task('default',cb => {
// 	console.log('run either `gulp build` or `gulp dev`');
// 	cb();
// });
//
// module.exports = {
// 	build:gulp.series('build')
// }

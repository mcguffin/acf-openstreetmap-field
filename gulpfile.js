var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var gulp = require('gulp');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var uglifycss = require('gulp-uglifycss');
var fs = require('fs');


function do_scss( src ) {
	var dir = src.substring( 0, src.lastIndexOf('/') );
	return gulp.src( './src/scss/' + src + '.scss' )
		.pipe( sourcemaps.init() )
		.pipe( sass( { outputStyle: 'nested' } ).on('error', sass.logError) )
		.pipe( autoprefixer({

		}) )
		.pipe( gulp.dest( './assets/css/' + dir ) )
        .pipe( sass( { outputStyle: 'compressed' } ).on('error', sass.logError) )
		.pipe( rename( { suffix: '.min' } ) )
        .pipe( sourcemaps.write() )
        .pipe( gulp.dest( './assets/css/' + dir ) );

}

function do_js( src ) {
	var dir = src.substring( 0, src.lastIndexOf('/') );
	return gulp.src( './src/js/' + src + '.js' )
		.pipe( sourcemaps.init() )
		.pipe( gulp.dest( './assets/js/' + dir ) )
		.pipe( uglify() )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( sourcemaps.write() )
		.pipe( gulp.dest( './assets/js/' + dir ) );
}

function concat_js( src, dest ) {
	return gulp.src( src )
		.pipe( sourcemaps.init() )
		.pipe( concat( dest ) )
		.pipe( sourcemaps.write() )
		.pipe( gulp.dest( './assets/js/' ) )
		.pipe( uglify() )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( gulp.dest( './assets/js/' ) );
}


// fake leaflet
L = {
	TileLayer: {
		extend: function(o) {
			for ( var s in o )
				L.TileLayer[s] = o[s];
			return L.TileLayer;
		},
//		Provider:{}
	},
	tileLayer:{}
}

// write providers data to ./etc
gulp.task('providers', function(cb){
	require('./node_modules/leaflet-providers/leaflet-providers.js');
	var providers = L.TileLayer.Provider.providers;

	return fs.writeFile( './etc/leaflet-providers.json', JSON.stringify( providers, null, '\t' ), cb );
});



gulp.task('scss', function() {
	return do_scss('acf-input-osm');
});


gulp.task('leaflet-css', gulp.parallel(
		function() {
			// frontend
			return gulp.src([
				'./node_modules/leaflet/dist/leaflet.css',
				'./node_modules/leaflet-control-geocoder/dist/Control.Geocoder.css',
			])
				.pipe( concat('./assets/css/') )
				.pipe( rename('leaflet.css') )
				.pipe( gulp.dest( './assets/css/' ) )
				.pipe( uglifycss() )
				.pipe( rename( { suffix: '.min' } ) )
				.pipe( gulp.dest( './assets/css/' ) );
		},
		function() {
			// copy images to css
			return gulp.src([
				'./node_modules/leaflet/dist/images/*.png',
				// './node_modules/leaflet-minimap/dist/images/*.png',
				'./node_modules/leaflet-control-geocoder/dist/images/*.gif',
				'./node_modules/leaflet-control-geocoder/dist/images/*.png',
			])
				.pipe( gulp.dest( './assets/css/images/' ) );
		}

	)
);



gulp.task('js-compat', function() {
    return concat_js( [
			'./src/js/compat/acf-duplicate-repeater.js',
		], 'compat/acf-duplicate-repeater.js');
});


gulp.task('js-field-group', function() {
    return concat_js( [
			'./src/js/acf-field-group-osm.js',
		], 'acf-field-group-osm.js');
});

gulp.task('js-admin', function() {
    return concat_js( [
			'./src/js/acf-input-osm.js',
		], 'acf-input-osm.js');
});


gulp.task( 'js-frontend', function(){
	return concat_js( [
			'./node_modules/leaflet/dist/leaflet-src.js',
			'./node_modules/leaflet-control-geocoder/dist/Control.Geocoder.js',
			'./node_modules/leaflet-providers/leaflet-providers.js',
			'./src/js/acf-osm-frontend.js',

		], 'acf-osm-frontend.js');
} );
gulp.task('js', gulp.parallel('js-frontend','js-admin','js-field-group','js-compat') );


gulp.task('pre-build', gulp.parallel('providers','leaflet-css') );

gulp.task('build', gulp.parallel('pre-build','scss','js') );



gulp.task('watch', function() {
	// place code for your default task here
	gulp.watch('./src/scss/**/*.scss',	gulp.parallel( 'scss' ) );
	gulp.watch('./src/js/**/*.js',		gulp.parallel( 'js' ) );
});

gulp.task( 'dev', gulp.series('pre-build', 'build', 'watch') );

gulp.task('default',cb => {
	console.log('run either `gulp build` or `gulp dev`');
	cb();
});

module.exports = {
	build:gulp.series('build')
}

var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var gulp = require('gulp');
var gulputil = require('gulp-util');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var fs = require('fs');

function do_scss( src ) {
	var dir = src.substring( 0, src.lastIndexOf('/') );
	return gulp.src( './src/scss/' + src + '.scss' )
		.pipe( sourcemaps.init() )
		.pipe( sass( { outputStyle: 'nested' } ).on('error', sass.logError) )
		.pipe( autoprefixer({
			browsers:['last 2 versions']
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
		.pipe( uglify().on('error', gulputil.log ) )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( sourcemaps.write() )
		.pipe( gulp.dest( './assets/js/' + dir ) );
}

function concat_js( src, dest ) {
	return gulp.src( src )
		.pipe( sourcemaps.init() )
		.pipe( concat( dest ) )
		.pipe( gulp.dest( './assets/js/' ) )
		.pipe( uglify().on('error', gulputil.log ) )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( sourcemaps.write() )
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

//modules = {};
gulp.task('providers', function(){
	require('./src/vendor/leaflet-providers/leaflet-providers.js');
	fs.writeFileSync( './etc/leaflet-providers.json', JSON.stringify(L.TileLayer.Provider.providers,null,'\t') );
})



gulp.task('scss', function() {
	return [
		do_scss('acf-input-osm'),
		do_scss('acf-field-group-osm')
	];
});


gulp.task('js-admin', function() {
    return [
		do_js('acf-input-osm'),
		do_js('acf-field-group-osm'),
    ];

});


gulp.task( 'js', function(){
	return concat_js( [
		'./src/vendor/Leaflet/dist/leaflet-src.js',
		'./src/vendor/leaflet-providers/leaflet-providers.js',
	], 'leaflet.js');
} );


gulp.task('build', ['scss','js','js-admin'] );


gulp.task('watch', function() {
	// place code for your default task here
	gulp.watch('./src/scss/**/*.scss',[ 'scss' ]);
	gulp.watch('./src/js/**/*.js',[ 'js', 'js-admin' ]);
});
gulp.task('default', ['build','watch']);

<?php
/**
 * Bootstrap the PHPUnit tests.
 *
 * @package acf-openstreetmap-field
 */

// Composer autoloader must be loaded before phpunit will be available.
require_once dirname( __DIR__ ) . '/vendor/autoload.php';

// Determine the tests directory (from a WP dev checkout).
// Try the WP_TESTS_DIR environment variable first.
$_tests_dir = getenv( 'WP_TESTS_DIR' );

// See if we're installed inside an existing WP dev instance.
if ( ! $_tests_dir ) {
	$_try_tests_dir = __DIR__ . '/../../../../../tests/phpunit';
	if ( file_exists( $_try_tests_dir . '/includes/functions.php' ) ) {
		$_tests_dir = $_try_tests_dir;
	}
}

// Fallback.
if ( ! $_tests_dir ) {
	$_tests_dir = '/tmp/wordpress-tests-lib';
}
require_once $_tests_dir . '/includes/functions.php';

// Activate the plugin.
tests_add_filter(
	'muplugins_loaded',
	function() {
		require_once dirname( __DIR__ ) . '/index.php';
	}
);

// Start up the WP testing environment.
require_once $_tests_dir . '/includes/bootstrap.php';

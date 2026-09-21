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

class SingletonTestCase extends WP_UnitTestCase {


	protected function assertHasFilter( $hook, $callback, $priority = null, $message = null ) {
		if ( is_null( $message ) ) {
			if ( is_string( $callback ) ) {
				$cb = $callback;
			} else if ( is_array( $callback ) ) {
				if ( is_string( $callback[0] ) ) {
					$cb = $callback[0] . '::';
				} else {
					$cb = get_class($callback[0]) . '->';
				}
				$cb .= $callback[1];
			} else if ( is_callable( $callback ) ) {
				$cb = '<anonymous>';
			}
			$message = sprintf(
				'No filter `%s` with callback `%s`',
				$hook,
				$cb
			);
		}
		$hasFilter = has_filter( $hook, $callback );
		if ( is_null( $priority ) ) {
			$this->assertIsInt( $hasFilter, $message );
		} else {
			$this->assertEquals( $priority, $hasFilter, $message );
		}
	}

	protected function assertHasAction( $hook, $callback, $priority = null, $message = null ) {
		if ( is_null( $message ) ) {
			if ( is_string( $callback ) ) {
				$cb = $callback;
			} else if ( is_array( $callback ) ) {
				if ( is_string( $callback[0] ) ) {
					$cb = $callback[0] . '::';
				} else {
					$cb = get_class($callback[0]) . '->';
				}
				$cb .= $callback[1];
			} else if ( is_callable( $callback ) ) {
				$cb = '<anonymous>';
			}
			$message = sprintf(
				'No action `%s` with callback `%s`',
				$hook,
				$cb
			);
		}
		$hasAction = has_action( $hook, $callback );
		if ( is_null( $priority ) ) {
			$this->assertIsInt( $hasAction, $message );
		} else {
			$this->assertEquals( $priority, $hasAction, $message );
		}
	}
}

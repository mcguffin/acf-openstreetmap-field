<?php

use PHPUnit\Framework\TestCase;

class MapProxy extends WP_UnitTestCase {
	/**
	 * Install Proxy dir
	 * @covers ACFFieldOpenstreetmap\WPCLI\Commands\MapProxy::install
	 */
	public function test_install() {

		$proxy = ACFFieldOpenstreetmap\Core\MapProxy::instance();

		$proxy->setup_proxy_dir( false );
		$this->assertFileExists(ABSPATH . 'wp-content/maps/.htaccess');
		$this->assertFileExists(ABSPATH . 'wp-content/maps/index.php');
	}

	/**
	 * Uninstall Proxy dir
	 * @covers ACFFieldOpenstreetmap\WPCLI\Commands\MapProxy::uninstall
	 */
	public function test_uninstall() {

		$proxy = ACFFieldOpenstreetmap\Core\MapProxy::instance();
		$proxy->reset_proxy_dir();

		$this->assertFalse(file_exists( ABSPATH . 'wp-content/maps/.htaccess' ), 'wp-content/maps/.htaccess still exists');
		$this->assertFalse(file_exists( ABSPATH . 'wp-content/maps/index.php' ), 'wp-content/maps/index.php still exists');
	}

	/**
	 * Configure local proxy
	 * @covers ACFFieldOpenstreetmap\WPCLI\Commands\MapProxy::configure
	 */
	public function test_configure() {

		$upload_dir = wp_upload_dir( null, false );
		$proxy = ACFFieldOpenstreetmap\Core\MapProxy::instance();
		$proxy->save_proxy_config( $upload_dir['basedir'] );

		$this->assertFileExists( $upload_dir['basedir'] . '/acf-osm-proxy-config.php' );
	}
}
<?php

use ACFFieldOpenstreetmap\Compat;
use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Settings;

class CoreTest extends SingletonTestCase {

	protected  function wpSetUpBeforeClass() {
		// global $wpdb;
		Settings\SettingsOpenStreetMap::instance();

		// var_dump(get_option('acf_osm_geocoder'),DB_NAME);
		// var_dump($wpdb->get_results("SELECT * FROM {$wpdb->options} WHERE option_name = 'acf_osm_geocoder';"));
	}
	protected static function wpTearDownAfterClass() {
	}

	/**
	 * @covers ACFFieldOpenstreetmap\Core\Core::__construct
	 * @covers ACFFieldOpenstreetmap\Core\LeafletGeocoders::__construct
	 * @covers ACFFieldOpenstreetmap\Core\LeafletProviders::__construct
	 * @covers ACFFieldOpenstreetmap\Core\MapProxy::__construct
	 * @covers ACFFieldOpenstreetmap\Core\OSMProviders::__construct
	 * @covers ACFFieldOpenstreetmap\Core\Templates::__construct
	 * @covers ACFFieldOpenstreetmap\Compat\ACF::__construct
	 * @covers ACFFieldOpenstreetmap\Settings\Settings::__construct
	 * @covers ACFFieldOpenstreetmap\Settings\SettingsOpenStreetMap::__construct
	 */
	public function test_instances() {

		$core = Core\Core::instance();
		$this->assertInstanceOf(Core\Core::class,$core);
		$this->assertHasAction( 'wp_enqueue_scripts', [ $core, 'register_assets' ] );
		$this->assertHasAction( 'login_enqueue_scripts', [ $core, 'register_assets' ] );
		if ( is_admin() ) {
			$this->assertHasAction( 'admin_enqueue_scripts', [ $core, 'register_assets' ] );
		}


		$compat = Compat\ACF::instance();
		$this->assertInstanceOf(Compat\ACF::class,$compat);
		$this->assertHasAction( 'polylang_acf_sync_supported_fields', [ $compat, 'add_pll_sync_field_type' ] );
		$this->assertHasAction( 'acf/input/admin_enqueue_scripts', [ $compat, 'acf_admin_enqueue_scripts' ] );

		$i3 = Core\LeafletGeocoders::instance();
		$this->assertInstanceOf(Core\LeafletGeocoders::class,$i3);

		$i4 = Core\LeafletProviders::instance();
		$this->assertInstanceOf(Core\LeafletProviders::class,$i4);

		$i5 = Core\MapProxy::instance();
		$this->assertInstanceOf(Core\MapProxy::class,$i5);

		$i6 = Core\OSMProviders::instance();
		$this->assertInstanceOf(Core\OSMProviders::class,$i6);

		$i7 = Core\Templates::instance();
		$this->assertInstanceOf(Core\Templates::class,$i7);

		$i8 = Settings\SettingsOpenStreetMap::instance();
		$this->assertInstanceOf(Settings\SettingsOpenStreetMap::class,$i8);

	}

	/**
	 * @covers ACFFieldOpenstreetmap\Core\Core::register_assets
	 * @covers ACFFieldOpenstreetmap\Core\LeafletGeocoders::get_geocoders
	 * @covers ACFFieldOpenstreetmap\Core\LeafletGeocoders::get_options
	 * @covers ACFFieldOpenstreetmap\Core\LeafletProviders::get_providers
	 * @covers ACFFieldOpenstreetmap\Core\LeafletProviders::get_layers
	 * @covers ACFFieldOpenstreetmap\Core\LeafletProviders::get_layer_config
	 * @covers ACFFieldOpenstreetmap\Core\OSMProviders::get_layers
	 */
	public function test_register_assets() {
		$core = Core\Core::instance();
		$core->register_assets();

		$wp_scripts = wp_scripts();
		$this->assertInstanceOf(_WP_Dependency::class, $wp_scripts->registered['acf-osm-frontend']);
		$this->assertInstanceOf(_WP_Dependency::class, $wp_scripts->registered['acf-input-osm']);
		$this->assertInstanceOf(_WP_Dependency::class, $wp_scripts->registered['acf-field-group-osm']);
		$this->assertInstanceOf(_WP_Dependency::class, $wp_scripts->registered['acf-osm-settings']);

		$wp_styles = wp_styles();
		$this->assertInstanceOf(_WP_Dependency::class, $wp_styles->registered['leaflet']);
		$this->assertInstanceOf(_WP_Dependency::class, $wp_styles->registered['acf-input-osm']);
		$this->assertInstanceOf(_WP_Dependency::class, $wp_styles->registered['acf-field-group-osm']);
		$this->assertInstanceOf(_WP_Dependency::class, $wp_styles->registered['acf-osm-settings']);
	}
}

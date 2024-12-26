<?php

namespace ACFFieldOpenstreetmap\Settings\Traits;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;

trait GeocoderSettings {

	private $geocoder_defaults = [
		// scale parameter for geocoder - detail
		'engine'   => 'nominatim', // Core\Core::GEOCODER_NOMINATIM,
		'opencage' => [
			'apikey' => null,
		],
		'scale'    => '18', // (int) 0-18 | 'auto'
	];

	/**
	 *	Setup Geocoder options
	 */
	private function register_settings_geocoder() {
		$settings_section  = 'acf_osm_geocoder';
		$geocoder_option   = get_option( 'acf_osm_geocoder' );

		register_setting( $this->optionset, 'acf_osm_geocoder', [ $this , 'sanitize_geocoder' ] );

		add_settings_section(
			$settings_section,
			__( 'Geocoder Settings', 'acf-openstreetmap-field' ),
			[ $this, 'tokens_description' ],
			$this->optionset
		);

		add_settings_field(
			"{$settings_section}-engine",
			__('Geocoder','acf-openstreetmap-field'),
			function() use ( $geocoder_option ) {
				echo $this->select_ui( [
					// TODO use constants from Core\Core
					'nominatim' => __( 'Nominatim', 'acf-openstreetmap-field' ),
					'photon'    => __( 'Photon', 'acf-openstreetmap-field' ),
					'opencage'  => __( 'OpenCage', 'acf-openstreetmap-field' ),
				], $geocoder_option['engine'], 'acf_osm_geocoder[engine]' );
			},
			$this->optionset,
			'geocoder'
		);
		add_settings_field(
			"{$settings_section}-opencage-apikey",
			__('OpenCage API Key','acf-openstreetmap-field'),
			function() use ( $geocoder_option ) {
				printf(
					'<input class="regular-text code" type="text" name="%1$s" value="%2$s" />',
					'acf_osm_geocoder[opencage][apikey]',
					$geocoder_option['opencage']['apikey']
				);
			},
			$this->optionset,
			'geocoder'
		);
		/*
		|                 NOMINATIM                     |  ACF OpenStreetMap Field |
		|-----------------------------------------------|--------------------------|
		|  zoom | Detail level (DE) | Detail level (US) |    zoom | Detail level   |
		|-------|-------------------|-------------------|---------|----------------|
		|     0 | country           | country           |       0 | country        |
		|     1 | country           | country           |       1 | country        |
		|     2 | country           | country           |       2 | country        |
		|     3 | country           | country           |       3 | country        |
		|     4 | country           | country           |       4 | country        |
		|     5 | state             | state             |       5 | state          |
		|     6 | state             | state             |       6 | state          |
		|     7 | state             | state             |       8 | county         |
		|     8 | county            | city              |       8 | county         |
		|     9 | county            | city              |       9 | county         |
		|    10 | village           | city              |      10 | village/suburb |
		|    11 | village           | city              |      11 | village/suburb |
		|    12 | village           | city              |      12 | village/suburb |
		|    13 | village           | suburb            |      13 | village/suburb |
		|    14 | postcode          | neighbourhood     |      16 | village/suburb |
		|    15 | postcode          | neighbourhood     |      16 | village/suburb |
		|    16 | road (major)      | road (major)      |      18 | building       |
		|    17 | road (+minor)     | road (+minor)     |      18 | building       |
		|    18 | building          | building          |      18 | building       |
		*/
		add_settings_field(
			"{$settings_section}-scale",
			__( 'Reverse Geocoder Detail Level', 'acf-openstreetmap-field' ),
			function() use ( $geocoder_option ) {
				echo $this->select_ui( [
					'auto' => __('Derived from zoom', 'acf-openstreetmap-field'),
					'0' => __('0 (Country)', 'acf-openstreetmap-field'),
					'1' => __('1', 'acf-openstreetmap-field'),
					'2' => __('2', 'acf-openstreetmap-field'),
					'3' => __('3', 'acf-openstreetmap-field'),
					'4' => __('4', 'acf-openstreetmap-field'),
					'5' => __('5', 'acf-openstreetmap-field'),
					'6' => __('6', 'acf-openstreetmap-field'),
					'7' => __('7', 'acf-openstreetmap-field'),
					'8' => __('8', 'acf-openstreetmap-field'),
					'9' => __('9', 'acf-openstreetmap-field'),
					'10' => __('10', 'acf-openstreetmap-field'),
					'11' => __('11', 'acf-openstreetmap-field'),
					'12' => __('12', 'acf-openstreetmap-field'),
					'13' => __('13', 'acf-openstreetmap-field'),
					'14' => __('14', 'acf-openstreetmap-field'),
					'15' => __('15', 'acf-openstreetmap-field'),
					'16' => __('16', 'acf-openstreetmap-field'),
					'17' => __('17', 'acf-openstreetmap-field'),
					'18' => __('18 (Building)', 'acf-openstreetmap-field'),
				], $geocoder_option['scale'], 'acf_osm_geocoder[scale]' );
			},
			$this->optionset,
			'geocoder'
		);
	}

	public function sanitize_geocoder( $new_values ) {

		// make sure it's default
		$new_values  = array_replace_recursive( $this->geocoder_defaults, $new_values );

		// merge old values
		$prev_values = get_option('acf_osm_geocoder');
		$values      = array_replace_recursive( $prev_values, $new_values );

		// TODO:
		// Check $values['engine'] against Core\Core::GEOCODERS
		// Check $values['scale'] against 0-18 | auto
		$values['opencage']['apikey'] = sanitize_text_field( $values['opencage']['apikey'] );
// var_dump($values);exit();
		return $values;

	}
}

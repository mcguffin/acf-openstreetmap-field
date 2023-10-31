<?php

namespace ACFFieldOpenstreetmap\Compat;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Field;


class ACF extends Core\Singleton {

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		// include field
		if ( 'acf/include_field_types' === current_action() ) {
			$this->include_field_types();
		} else {
			add_action('acf/include_field_types', [ $this, 'include_field_types' ] ); // v5
		}
		// add_action( 'acf/render_field/type=leaflet_map', [ $this, 'render_map_input' ] );

		// Compat with https://github.com/mcguffin/polylang-sync
		add_filter( 'polylang_acf_sync_supported_fields', [ $this, 'add_pll_sync_field_type'] );

		add_action( 'acf/input/admin_enqueue_scripts', [ $this, 'acf_admin_enqueue_scripts' ] );
	}

	/**
	 *	@action acf/input/admin_enqueue_scripts
	 */
	public function acf_admin_enqueue_scripts() {
		wp_enqueue_media();
	}

	/**
	 *	@filter polylang_acf_sync_supported_fields
	 */
	public function add_pll_sync_field_type($fields) {
		$fields[] = 'open_street_map';
		return $fields;
	}

	/**
	 *	@action acf/render_field/type=leaflet_map
	 */
	public function render_map_input( $field ) {

		$inp_field = [
			'return_format'	=> $field['return_format'],
			'value'	=> $field['value'],
			'height'		=> 400,
			'attr'	=> $field['attr'],
		];

		if ( isset( $field['attr'] ) ) {
			$inp_field['attr'] = $field['attr'];
		}

		$map_field = acf_get_field_type('open_street_map');

		// format_value() returns sanitized HTML
		echo $map_field->format_value( $field['value'], null, $inp_field ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 *  @action acf/include_field_types
	 *
	 *  This function will include the field type class
	 *
	 *  @type	function
	 *  @date	17/02/2016
	 *  @since	1.0.0
	 *
	 *  @param	$version (int) major ACF version. Defaults to false
	 *  @return	n/a
	 */
	public function include_field_types( $version = false ) {

		if ( version_compare( acf_get_setting('version'), '5.7', '>=' ) ) {
			acf_register_field_type( Field\OpenStreetMap::get_instance() );
		}
	}
}

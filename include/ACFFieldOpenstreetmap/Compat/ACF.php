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
	function include_field_types( $version = false ) {

		if ( version_compare( acf_get_setting('version'), '5.7', '>=' ) ) {
			Field\OpenStreetMap::get_instance();
		}

	}

}

<?php

namespace ACFFieldOpenstreetmap\Compat;

use ACFFieldOpenstreetmap\Field;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


use ACFFieldOpenstreetmap\Core;


class ACF extends Core\PluginComponent {

	protected function __construct() {
		// include field
		add_action('acf/include_field_types', 	array($this, 'include_field_types')); // v5
//		add_action('acf/register_fields', 		array($this, 'include_field_types')); // v4

	}

	/**
	 *  include_field_types
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

		array(
			'version'	=> '0.0.1',
			'url'		=> plugin_dir_url( __FILE__ ),
			'path'		=> plugin_dir_path( __FILE__ )
		);

		new Field\OpenStreetMap();
	}

	/**
	 *	@inheritdoc
	 */
	public function activate(){

	}

	/**
	 *	@inheritdoc
	 */
	public function deactivate(){

	}

	/**
	 *	@inheritdoc
	 */
	public function uninstall() {
	 // remove content and settings
	}

	/**
 	 *	@inheritdoc
	 */
	public function upgrade( $new_version, $old_version ) {
	}

}

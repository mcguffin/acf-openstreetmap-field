<?php

namespace AcfOpenstreetmapField\Compat;


use AcfOpenstreetmapField\Core;


class ACF extends Core\PluginComponent {

	protected function __construct() {

		add_action('init',array( $this, 'init' ) );

	}
	public function init(){

		acf_register_field_type( 'AcfOpenstreetmapField\ACF\FieldOSM' );

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

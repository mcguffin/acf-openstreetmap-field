<?php

namespace ACFFieldOpenstreetmap\Settings;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

use ACFFieldOpenstreetmap\Core;

abstract class Settings extends Core\Singleton {

	/**
	 *	@inheritdoc
	 */
	protected function __construct(){

		add_action( 'admin_init' , [ $this, 'register_settings' ] );

		parent::__construct();

	}

	abstract function register_settings();

}

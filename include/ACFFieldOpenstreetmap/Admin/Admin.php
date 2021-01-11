<?php

namespace ACFFieldOpenstreetmap\Admin;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

use ACFFieldOpenstreetmap\Core;

class Admin extends Core\Singleton {
	
	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_block_assets' ] );
	}
	
	
	/**
	 *	Enqueue Block Assets
	 *
	 *	@action enqueue_block_editor_assets
	 */
	public function enqueue_block_assets() {
		Core\Core::instance()->register_assets();

		wp_enqueue_script( 'acf-osm-blocks' );
		wp_enqueue_style( 'acf-osm-blocks' );

	}
}



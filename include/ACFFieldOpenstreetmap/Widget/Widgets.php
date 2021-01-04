<?php


namespace ACFFieldOpenstreetmap\Widget;

use ACFFieldOpenstreetmap\Core;

class Widgets extends Core\Singleton {
	
	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		add_action( 'widgets_init', [ $this, 'widgets_init' ] );
		add_action( 'load-widgets.php', [ $this, 'enqueue_assets' ] );
	}
	
	/**
	 *	@action load-widgets.php
	 */
	public function enqueue_assets() {
		wp_enqueue_script('acf-osm-admin');

		wp_enqueue_style('acf-osm-admin');

		wp_enqueue_style('leaflet');
	}

	
	/**
	 *	@action widgets_init
	 */
	public function widgets_init() {
		register_widget( '\ACFFieldOpenstreetmap\Widget\LeafletWidget' );
		register_widget( '\ACFFieldOpenstreetmap\Widget\OSMWidget' );
	}
}


<?php

namespace ACFFieldOpenstreetmap\Compat;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


use ACFFieldOpenstreetmap\Core;

class WPPageBuilder extends Core\Singleton {
	
	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		
		add_action( 'siteorigin_panel_enqueue_admin_scripts', [ Core\Core::instance(), 'enqueue_admin' ] );

		/// set widgets icons
		add_filter('siteorigin_panels_widgets', function( $widgets ) {
			foreach ([ '\ACFFieldOpenstreetmap\Widget\LeafletWidget', '\ACFFieldOpenstreetmap\Widget\OSMWidget'] as $class ) {
				if ( isset( $widgets[ $class ] ) ) {
					$widgets[ $class ]['icon'] = 'dashicons dashicons-location-alt';
				}
			}
			return $widgets;
		});
	}

}
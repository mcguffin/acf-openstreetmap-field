<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}
use ACFFieldOpenstreetmap\Compat;

class Core extends Plugin {

	private $leaflet_providers = null;

	/**
	 *	@inheritdoc
	 */
	protected function __construct( $file ) {

		add_action( 'acf/include_field_types' , array( '\ACFFieldOpenstreetmap\Compat\ACF' , 'instance' ), 0 );

		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );

		if ( is_admin() ) {
			add_action( 'admin_enqueue_scripts', array( $this, 'register_assets' ) );
		}

		$args = func_get_args();
		parent::__construct( ...$args );
	}

	/**
	 *	@action wp_enqueue_scripts
	 */
	public function register_assets() {

		$leaflet_providers = LeafletProviders::instance();
		$osm_providers = OSMProviders::instance();
		
		$screen = get_current_screen();

		$provider_filters = ['credentials'];

		if ( ! is_admin() || $screen->base !== 'settings_page_acf_osm' ) {

			$provider_filters[] = 'enabled';

		}

		/* frontend */
		/**
		 *	Marker Icon HTML. Return false to use image icon (either leaflet default or return value of filter `acf_osm_marker_icon`)
		 *
		 *	@param $marker_icon_html string Additional Icon HTML.
		 */
		$marker_html = apply_filters('acf_osm_marker_html', false );

		if ( $marker_html !== false ) {
			$marker_html = wp_kses_post( $marker_html );
		}

		wp_register_script( 'acf-osm-frontend', $this->get_asset_url( 'assets/js/acf-osm-frontend.js' ), array( 'jquery' ), $this->get_version(), true );

		wp_localize_script('acf-osm-frontend','acf_osm', array(
			'options'	=> array(
				'layer_config'	=> $this->filter_recursive( get_option( 'acf_osm_provider_tokens', array() ) ),
				'marker'		=> array(

					'html'		=> $marker_html,

					/**
					 *	HTML Marker Icon css class
					 *
					 *	@param $classname string Class name for HTML icon. Default 'acf-osm-marker-icon'
					 */
					'className'	=> sanitize_html_class( apply_filters('acf_osm_marker_classname', 'acf-osm-marker-icon' ) ),

					/**
					 *	Return leaflet icon options.
					 *
					 *	@see https://leafletjs.com/reference-1.3.2.html#icon
					 *
					 *	@param $icon_options false (leaflet default icon or HTML icon) or array(
					 *		'iconUrl'			=> image URL
					 *		'iconRetinaUrl'		=> image URL
					 *		'iconSize'			=> array( int, int )
					 *		'iconAnchor'		=> array( int, int )
					 *		'popupAnchor'		=> array( int, int )
					 *		'tooltipAnchor'		=> array( int, int )
					 *		'shadowUrl'			=> image URL
					 *		'shadowRetinaUrl'	=> image URL
					 *		'shadowSize'		=> array( int, int )
					 *		'shadowAnchor'		=> array( int, int )
					 *		'className'			=> string
				 	 *	)
					 */
					'icon'		=> apply_filters('acf_osm_marker_icon', false ),
				),

			),
			'providers'		=> $leaflet_providers->get_providers( $provider_filters ),
		));

		wp_register_style( 'leaflet', $this->get_asset_url( 'assets/css/leaflet.css' ), array(), $this->get_version() );

		/* backend */

		// field js
		wp_register_script( 'acf-input-osm', $this->get_asset_url('assets/js/acf-input-osm.js'), array('acf-input','wp-backbone'), $this->get_version(), true );
		wp_localize_script( 'acf-input-osm', 'acf_osm_admin', array(
			'options'	=> array(
				'osm_layers'		=> $osm_providers->get_layers(), // flat list
				'leaflet_layers'	=> $leaflet_providers->get_layers(),  // flat list
				'accuracy'			=> 7,
			),
			'i18n'	=> array(
				'search'		=> __( 'Search...', 'acf-openstreetmap-field' ),
				'nothing_found'	=> __( 'Nothing found...', 'acf-openstreetmap-field' ),
				'my_location'	=> __( 'My location', 'acf-openstreetmap-field' ),
				'add_marker_at_location'
					=> __( 'Add Marker at location', 'acf-openstreetmap-field' ),
				'fit_markers_in_view'
				 				=> __( 'Fit markers into view', 'acf-openstreetmap-field' ),
				'address_format'	=> array(
					/* translators: address format for marker labels (street level). Available placeholders {building} {road} {house_number} {postcode} {city} {town} {village} {hamlet} {state} {country} */
					'street'	=> __( '{building} {road} {house_number}', 'acf-openstreetmap-field' ),
					/* translators: address format for marker labels (city level). Available placeholders {building} {road} {house_number} {postcode} {city} {town} {village} {hamlet} {state} {country} */
					'city'		=> __( '{postcode} {city} {town} {village} {hamlet}', 'acf-openstreetmap-field' ),
					/* translators: address format for marker labels (country level). Available placeholders {building} {road} {house_number} {postcode} {city} {town} {village} {hamlet} {state} {country} */
					'country'	=> __( '{state} {country}', 'acf-openstreetmap-field' ),
				)
			),
		));
		wp_register_script( 'acf-field-group-osm', $this->get_asset_url('assets/js/acf-field-group-osm.js'), array('acf-field-group','acf-input-osm'), $this->get_version(), true );

		// compat duplicate repeater
		wp_register_script( 'acf-osm-compat-duplicate-repeater', $this->get_asset_url( 'assets/js/compat/acf-duplicate-repeater.js' ), array( 'acf-duplicate-repeater' ), $this->get_version() );


		// field css
		wp_register_style( 'acf-input-osm', $this->get_asset_url( 'assets/css/acf-input-osm.css' ), array('acf-input','dashicons'), $this->get_version() );

		// field css

		wp_register_style( 'acf-osm-settings', $this->get_asset_url( 'assets/css/acf-osm-settings.css' ), array('leaflet'), $this->get_version() );
		wp_register_script( 'acf-osm-settings', $this->get_asset_url( 'assets/js/acf-osm-settings.js' ), array('acf-osm-frontend'), $this->get_version() );


		/*
		Deps:
			acf-osm-compat-duplicate-repeater
				acf-duplicate-repeater (3rd party)
			acf-field-group-osm
				acf-field-group
				acf-input-osm
					acf-input
					wp-backbone
			acf-osm-frontend
				jquery
		*/

	}

	/**
	 *	Get asset url for this plugin
	 *
	 *	@param	string	$asset	URL part relative to plugin class
	 *	@return wp_enqueue_editor
	 */
	public function get_asset_url( $asset ) {

		if ( ! defined('SCRIPT_DEBUG') || ! SCRIPT_DEBUG ) {
			$pi = pathinfo($asset);
			$asset = $pi['dirname'] . DIRECTORY_SEPARATOR . $pi['filename'] . '.min.' . $pi['extension'];
		}
		return plugins_url( $asset, $this->get_plugin_file() );
	}



	/**
	 *	@param array $arr
	 *	@return array
	 */
	private function filter_recursive( $arr ) {
		foreach ( $arr as &$value ) {
			if ( is_array( $value ) ) {
				$value = $this->filter_recursive( $value );
			}
		}
		$arr = array_filter( $arr );
		return $arr;
	}

}

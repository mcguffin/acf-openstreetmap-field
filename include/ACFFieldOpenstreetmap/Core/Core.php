<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}
use ACFFieldOpenstreetmap\Compat;

class Core extends Plugin {

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {



		add_action( 'plugins_loaded' , array( $this , 'load_textdomain' ) );
		add_action( 'plugins_loaded' , array( $this , 'init_compat' ), 0 );
		add_action( 'init' , array( $this , 'init' ) );

		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );

		if ( is_admin() ) {
			add_action( 'admin_enqueue_scripts', array( $this, 'register_assets' ) );
		}

		parent::__construct();
	}

	/**
	 *	@action wp_enqueue_scripts
	 */
	public function register_assets() {

		/* frontend */

		wp_register_script( 'acf-osm-frontend', $this->get_asset_url( 'assets/js/acf-osm-frontend.js' ), array( 'jquery' ), $this->version(), true );
		wp_localize_script('acf-osm-frontend','acf_osm',array(
			'options'	=> array(
				'layer_config'	=> get_option( 'acf_osm_provider_tokens', array() ),
				'marker'		=> array(

					/**
					 *	Marker Icon HTML. Return false to use image icon (either leaflet default or return value of filter `acf_osm_marker_icon`)
					 *
					 *	@param $marker_icon_html string Additional Icon HTML.
					 */
					'html'		=> wp_kses_post( apply_filters('acf_osm_marker_html', false ) ),

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
		));

		wp_register_style( 'leaflet', $this->get_asset_url( 'assets/css/leaflet.css' ), array(), $this->version() );


		/* backend */

		// field js
		wp_register_script( 'acf-input-osm', $this->get_asset_url('assets/js/acf-input-osm.js'), array('acf-input','backbone'), $this->version(), true );
		wp_localize_script( 'acf-input-osm', 'acf_osm_admin', array(
			'options'	=> array(
				'layer_config'	=> get_option( 'acf_osm_provider_tokens', array() ),
				'osm_layers'	=> $this->get_osm_layers(),
				'providers'		=> $this->get_layer_providers(),
			),
		));

		// field css
		wp_register_style( 'acf-input-osm', $this->get_asset_url( 'assets/css/acf-input-osm.css' ), array('acf-input'), $this->version() );


	}

	/**
	 *	Load frontend styles and scripts
	 *
	 *	@action wp_enqueue_scripts
	 */
	public function wp_enqueue_style() {
	}


	/**
	 *	Load Compatibility classes
	 *
	 *  @action plugins_loaded
	 */
	public function init_compat() {
		if ( function_exists( 'acf' ) ) {
			Compat\ACF::instance();
		}
	}


	/**
	 *	Load text domain
	 *
	 *  @action plugins_loaded
	 */
	public function load_textdomain() {
		$path = pathinfo( dirname( ACF_FIELD_OPENSTREETMAP_FILE ), PATHINFO_FILENAME );
		load_plugin_textdomain( 'acf-field-openstreetmap', false, $path . '/languages' );
	}

	/**
	 *	Init hook.
	 *
	 *  @action init
	 */
	public function init() {

	}


	/**
	 *	get default OPenStreetMap Layers
	 *
	 *	@return array(
	 *		'layer_id' => 'Layer Label'
	 *	)
	 */
	function get_osm_layers( ) {
		/*
		mapnik
		cyclemap C 	Cycle
		transportmap T	Transport
		hot H	Humantarian
		*/
		return array(
			'mapnik'		=> 'OpenStreetMap',
			'cyclemap'		=> 'Thunderforest.OpenCycleMap',
			'transportmap'	=> 'Thunderforest.Transport',
			'hot'			=> 'OpenStreetMap.HOT',
		);
	}

	/**
	 *	get providers and variants
	 *	omits proviers with unconfigured api credentials
	 *	as well as local-only map data
	 *
	 *	@return array(
	 *		'ProviderName' => array(
	 *			'ProviderName.VariantName'	=> 'VariantName'
	 *		)
	 *	)
	 */
	public function get_layer_providers( ) {

		$providers 			= array();
		$leaflet_providers	= $this->get_leaflet_providers( );//json_decode( file_get_contents( ACF_FIELD_OPENSTREETMAP_DIRECTORY . '/etc/leaflet-providers.json'), true );
		//$access_tokens		= get_option( 'acf_osm_provider_tokens', array() );
		$access_tokens		= get_option( 'acf_osm_provider_tokens', array() );

		foreach ( $leaflet_providers as $provider => $provider_data ) {

			// drop boundless maps
			if ( isset($provider_data['options']['bounds'])) {
				continue;
			}
			$new_provider_data = array();
			// skip provider if api credentials required
			//    the key is not consitent, can be `api_key`, `accessToken`, `app_id`, ...
			//    value is always something like `<insert your ... token heren>`
			foreach ( $provider_data['options'] as $option => $option_value ) {

				if ( is_string($option_value) && preg_match( '/^<([^>]+)>$/', $option_value ) ) {
					if ( isset( $access_tokens[$provider]['options'][$option] ) && ! empty( $access_tokens[$provider]['options'][$option] ) ) {
						break;
					} else {
						continue 2;
					}
				}
			}

			$providers[$provider] = $new_provider_data;

			if ( isset( $provider_data[ 'variants' ] ) ) {
				foreach ( $provider_data[ 'variants' ] as $variant => $variant_data ) {
					if ( ! is_string( $variant_data ) && isset( $variant_data['options']['bounds'] ) ) {
						// no variants with bounds!
						continue;
					} else if ( is_string( $variant_data ) || isset( $variant_data['options']/*['variant']*/ ) ) {
						$providers[$provider][$provider . '.' . $variant] = $variant;
					} else {
						$providers[$provider][$provider] = $provider;
					}
				}
			} else {
				$providers[$provider][$provider] = $provider;
			}
		}

		return $providers;
	}

	/**
	 *	returns leaflet providers with configured access tokens
	 *	@return array
	 */
	public function get_leaflet_providers( ) {
		$leaflet_providers	= json_decode( file_get_contents( ACF_FIELD_OPENSTREETMAP_DIRECTORY . '/etc/leaflet-providers.json'), true );
		return $leaflet_providers;
		$access_tokens		= get_option( 'acf_osm_provider_tokens', array() );
		return array_replace_recursive( $leaflet_providers, $access_tokens );
	}


	// private function deep_replace( $repl, $str ) {
	// 	if ( is_array( $repl ) ) {
	// 		foreach ( $repl as $key => $value ) {
	// 			if ( is_string( $value ) ) {
	// 				$str = str_replace('{'.$key.'}', $value, $str );
	// 			} else {
	// 				$str = $this->deep_replace( $value, $str );
	//
	// 			}
	// 		}
	// 	}
	// 	return $str;
	// }

	/**
	 *	Get places in provider config, where an access token should be entered.
	 */
	public function get_provider_token_options( ) {

		$providers		= json_decode( file_get_contents( ACF_FIELD_OPENSTREETMAP_DIRECTORY . '/etc/leaflet-providers.json'), true );

		$token_options	= array();

		foreach ( $providers as $provider => $data ) {
			foreach( $data['options'] as $option => $value ) {
				if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) ) { // '<insert your [some token] here>'

					if ( ! isset($token_options[ $provider ]['options'] ) ) {
						$token_options[ $provider ] = array( 'options' => array() );
					}
					$token_options[ $provider ]['options'][ $option ] = '';
				}
			}
		}
		return $token_options;
	}



	/**
	 *	Get asset url for this plugin
	 *
	 *	@param	string	$asset	URL part relative to plugin class
	 *	@return wp_enqueue_editor
	 */
	public function get_asset_url( $asset ) {
		return plugins_url( $asset, ACF_FIELD_OPENSTREETMAP_FILE );
	}



}

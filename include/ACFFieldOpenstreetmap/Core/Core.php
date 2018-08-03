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
		add_action( 'wp_enqueue_scripts' , array( $this , 'wp_enqueue_style' ) );

		parent::__construct();
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
			'mapnik'		=> __('Standard','osm-layer','acf-open-street-map'),
			'cyclemap'		=> __('Cycle Map','osm-layer','acf-open-street-map'),
			'transportmap'	=> __('Transport map','osm-layer','acf-open-street-map'),
			'hot'			=> __('Humanitarian','osm-layer','acf-open-street-map'),
		);
	}

	/**
	 *	get default OPenStreetMap Layers
	 *
	 *	@return array(
	 *		'layer_id' => array('label' => 'Layer Label', 'provider' => 'leaflet-provider ID' )
	 *	)
	 */
	function get_osm_layers_config( ) {
		/*
		mapnik
		cyclemap C 	Cycle
		transportmap T	Transport
		hot H	Humantarian
		*/


		return array(
			'mapnik'		=> array(
				'lable' 		=>__('Standard','osm-layer','acf-open-street-map'),
				'provider'		=> 'OpenStreetMap.Mapnik',
			),
			'cyclemap'		=> array(
				'lable' 		=> __('Cycle Map','osm-layer','acf-open-street-map'),
				'provider'		=> 'Thunderforest.OpenCycleMap',
			),
			'transportmap'	=> array(
				'lable' 		=> __('Transport map','osm-layer','acf-open-street-map'),
				'provider'		=> 'Thunderforest.Transport',
			),
			'hot'		=> array(
				'lable' 		=> __('Humanitarian','osm-layer','acf-open-street-map'),
				'provider'		=> 'OpenStreetMap.HOT',
			),
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
					} else if ( is_string( $variant_data ) || isset( $variant_data['options']['variant'] ) ) {
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

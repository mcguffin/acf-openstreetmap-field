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

		wp_localize_script('acf-osm-frontend','acf_osm',array(
			'options'	=> array(
				'layer_config'	=> get_option( 'acf_osm_provider_tokens', array() ),
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
			'providers'		=> $this->get_layer_providers(),
		));

		wp_register_style( 'leaflet', $this->get_asset_url( 'assets/css/leaflet.css' ), array(), $this->get_version() );

		/* backend */

		// field js
		wp_register_script( 'acf-input-osm', $this->get_asset_url('assets/js/acf-input-osm.js'), array('acf-input','wp-backbone'), $this->get_version(), true );
		wp_localize_script( 'acf-input-osm', 'acf_osm_admin', array(
			'options'	=> array(
				'osm_layers'		=> $this->get_osm_layers(),
				'leaflet_layers'	=> $this->get_leaflet_layers(),
				'accuracy'			=> 7,
			),
			'i18n'	=> array(
				'search'		=> __( 'Search...', 'acf-openstreetmap-field' ),
				'nothing_found'	=> __( 'Nothing found...', 'acf-openstreetmap-field' ),
				'my_location'		=> __( 'My location', 'acf-openstreetmap-field' ),
				'add_marker_at_location' => __( 'Add Marker at location', 'acf-openstreetmap-field' )
			),
		));
		wp_register_script( 'acf-field-group-osm', $this->get_asset_url('assets/js/acf-field-group-osm.js'), array('acf-field-group','acf-input-osm'), $this->get_version(), true );

		// compat duplicate repeater
		wp_register_script( 'acf-osm-compat-duplicate-repeater', $this->get_asset_url( 'assets/js/compat/acf-duplicate-repeater.js' ), array( 'acf-duplicate-repeater' ), $this->get_version() );


		// field css
		wp_register_style( 'acf-input-osm', $this->get_asset_url( 'assets/css/acf-input-osm.css' ), array('acf-input','dashicons'), $this->get_version() );



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
	 *	get default OpenStreetMap Layers
	 *
	 *	@return array(
	 *		'layer_id' => 'Layer Label',
	 *		...
	 *	)
	 */
	public function get_osm_layers( $context = 'iframe' ) {
		/*
		mapnik
		cyclemap C 	Cycle
		transportmap T	Transport
		hot H	Humantarian
		*/
		if ( 'iframe' === $context ) {
			return array(
				'mapnik'		=> 'OpenStreetMap',
				'cyclemap'		=> 'Thunderforest.OpenCycleMap',
				'transportmap'	=> 'Thunderforest.Transport',
				'hot'			=> 'OpenStreetMap.HOT',
			);			
		} else if ( 'link' === $context ) {
			return array(
				'H' => 'OpenStreetMap.HOT',
				'T' => 'Thunderforest.Transport',
				'C' => 'Thunderforest.OpenCycleMap',
			);
		}
	}


	public function map_osm_layer( $layers, $context = 'iframe' ) {

		$mapping = $this->get_osm_layers( $context );

		foreach ( (array) $layers as $layer ) {
			$mapped = array_search( $layer, $mapping );
			if ( $mapped !== false ) {
				return $mapped;
			}
		}
		return false;
	}

	/**
	 *	Get layer data from leaflet providers
	 *
	 *	@return array [
	 *		'provider_key' 			=> 'provider',
	 *		'provider_key.variant'	=> 'provider.variant',
	 *		...
	 * ]
	 */
	public function get_leaflet_layers() {
		$providers = array();

		foreach ( $this->get_layer_providers() as $provider_key => $provider_data ) {
			//

			if ( isset( $provider_data[ 'variants' ] ) ) {
				foreach ( $provider_data[ 'variants' ] as $variant => $variant_data ) {
					if ( ! is_string( $variant_data ) && isset( $variant_data['options']['bounds'] ) ) {
						// no variants with bounds!
						continue;
					}
					if ( is_string( $variant_data ) || isset( $variant_data['options'] ) ) {


						$providers[ $provider_key . '.' . $variant ] = $provider_key . '.' . $variant;
					} else {
						$providers[ $provider_key ] = $provider_key;
					}
				}
			} else {
				$providers[ $provider_key ] = $provider_key;
			}
		}
		return $providers;
	}

	/**
	 *	Get providers and variants
	 *	Omits proviers with unconfigured api credentials
	 *
	 *	@return array
	 */
	public function get_layer_providers( ) {

		if ( is_null( $this->leaflet_providers ) ) {
			$leaflet_providers	= $this->get_leaflet_providers( );//json_decode( file_get_contents( ACF_FIELD_OPENSTREETMAP_DIRECTORY . '/etc/leaflet-providers.json'), true );

			// add mapbox ids as variant. See https://www.mapbox.com/api-documentation/#maps
			$mapbox_variants = array(
				'streets',
				'light',
				'dark',
				'satellite',
				'streets-satellite',
				'wheatpaste',
				'streets-basic',
				'comic',
				'outdoors',
				'run-bike-hike',
				'pencil',
				'pirates',
				'emerald',
				'high-contrast',
			);
			$leaflet_providers['MapBox']['variants'] = array();
			foreach ( $mapbox_variants as $variant ) {
				$key = ucwords( $variant, " \t\r\n\f\v-_." );
				$key = preg_replace( '@\s\r\n\v\.-_@imsU', '', $key );
				$leaflet_providers['MapBox']['variants'][ $key ] = 'mapbox.'.$variant;
			}
			$leaflet_providers['MapBox']['url'] = str_replace('{id}','{variant}',$leaflet_providers['MapBox']['url']);
			$leaflet_providers['MapBox']['options']['variant'] = 'mapbox.streets';

			// remove falsy configuration
			unset( $leaflet_providers['MapBox']['options']['id'] );



			// merge access tokens
			$access_tokens = get_option( 'acf_osm_provider_tokens', array() );

			$new_providers = array();

			foreach ( $leaflet_providers as $provider_key => $provider_data ) {

				// drop boundless maps
				if ( isset($provider_data['options']['bounds'])) {
					continue;
				}

				// skip provider if api credentials required
				//    the key is not consitent, can be `api_key`, `accessToken`, `app_id`, ...
				//    value is always something like `<insert your ... heren>`
				foreach ( $provider_data['options'] as $option => $option_value ) {

					if ( is_string( $option_value) && preg_match( '/^<([^>]+)>$/', $option_value ) ) {
						// option is an access key
						if ( isset( $access_tokens[$provider_key]['options'][$option] ) && ! empty( $access_tokens[$provider_key]['options'][$option] ) ) {
							// we know the access key
							$provider_data['options'][ $option ] = $access_tokens[$provider_key]['options'][$option];
							
						} else {
							// remove provider
							continue;
						}
					}
				}
				$new_providers[ $provider_key ] = $provider_data;
			}

			$this->leaflet_providers = apply_filters( 'acf_osm_leaflet_providers', $new_providers );
		}

		// configure mapbox styles as variants
		return $this->leaflet_providers;
	}


	/**
	 *	returns leaflet providers with configured access tokens
	 *	@return array
	 */
	public function get_leaflet_providers( ) {

		$leaflet_providers	= json_decode( file_get_contents( $this->get_plugin_dir() . '/etc/leaflet-providers.json'), true );

		return $leaflet_providers;

	}


	/**
	 *	Get places in provider config, where an access token should be entered.
	 */
	public function get_provider_token_options( ) {

		$providers		= json_decode( file_get_contents( $this->get_plugin_dir() . '/etc/leaflet-providers.json'), true );

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

		if ( ! defined('SCRIPT_DEBUG') || ! SCRIPT_DEBUG ) {
			$pi = pathinfo($asset);
			$asset = $pi['dirname'] . DIRECTORY_SEPARATOR . $pi['filename'] . '.min.' . $pi['extension'];
		}
		return plugins_url( $asset, $this->get_plugin_file() );
	}



}

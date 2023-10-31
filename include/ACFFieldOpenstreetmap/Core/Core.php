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

		add_action( 'acf/include_field_types', [ '\ACFFieldOpenstreetmap\Compat\ACF', 'instance'], 0 );

		add_action( 'init', [ '\ACFFieldOpenstreetmap\Core\Templates', 'instance'] );

		add_action( 'wp_enqueue_scripts', [ $this, 'register_assets' ] );

		add_action( 'login_enqueue_scripts', [ $this, 'register_assets' ] );

		if ( is_admin() ) {
			add_action( 'admin_enqueue_scripts', [ $this, 'register_assets' ] );
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

		$provider_filters = ['credentials'];

		if ( ! is_admin() || get_current_screen()->base !== 'settings_page_acf_osm' ) {
			$provider_filters[] = 'enabled';
		}

		$language = substr( get_locale(), 0, 2 );

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

		$osm_l10n = [
			'options'	=> [
				'layer_config'	=> $leaflet_providers->get_layer_config(),
				'marker'		=> [

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
				],

			],
			'providers'		=> $leaflet_providers->get_providers( $provider_filters ),
		];
		$osm_admin = [
			'options'	=> [
				'osm_layers'		=> $osm_providers->get_layers(), // flat list
				'leaflet_layers'	=> $leaflet_providers->get_layers(),  // flat list
				'accuracy'			=> 7,
				/**
				 *	Filter Leaflet control geocoder options.
				 *
				 *	@see https://www.liedman.net/leaflet-control-geocoder/docs/interfaces/geocodercontroloptions.html
				 *
				 *	@param $geocoder_options array(
				 *		'collapsed'				=> boolean
				 *		'defaultMarkGeocode'	=> boolean
				 *		'errorMessage'			=> string
				 *		'position'				=> string
				 *		'expand'				=> string ("touch" | "click" | "hover")
				 *		'iconLabel'				=> string
				 *		'placeholder'			=> string
				 *		'queryMinLength'		=> number
				 *		'showResultIcons'		=> boolean
				 *		'suggestMinLength'		=> number
				 *		'suggestTimeout'		=> number
				 *	)
				 */
				'geocoder' 			=> apply_filters( 'acf_osm_geocoder_options', [] ),
				/**
				 *	Filter Nominatim geocoder options.
				 *
				 *	@see https://www.liedman.net/leaflet-control-geocoder/docs/interfaces/nominatimoptions.html
				 *
				 *	@param $nominatim_options array(
				 *		'apiKey'				=> boolean
				 *		'geocodingQueryParams'	=> object @see https://nominatim.org/release-docs/develop/api/Search/
				 *		'reverseQueryParams'	=> object @see https://nominatim.org/release-docs/develop/api/Reverse/
				 *		'serviceUrl'			=> string
				 *	)
				 */
				'nominatim'			=> apply_filters( 'acf_osm_nominatim_options', [
					'geocoderQueryParams' => [ 'accept-language' => $language, ],
					'reverseQueryParams' => [ 'accept-language' => $language, ],
				]),
			],
			'i18n'	=> [
				'search'		=> __( 'Search...', 'acf-openstreetmap-field' ),
				'nothing_found'	=> __( 'Nothing found...', 'acf-openstreetmap-field' ),
				'my_location'	=> __( 'My location', 'acf-openstreetmap-field' ),
				'add_marker_at_location'
					=> __( 'Add Marker at location', 'acf-openstreetmap-field' ),
				'fit_markers_in_view'
				 				=> __( 'Fit markers into view', 'acf-openstreetmap-field' ),
				'address_format'	=> [
					/* translators: address format for marker labels (street level). Available placeholders {building} {road} {house_number} {postcode} {city} {town} {village} {hamlet} {state} {country} */
					'street'	=> __( '{building} {road} {house_number}', 'acf-openstreetmap-field' ),
					/* translators: address format for marker labels (city level). Available placeholders {building} {road} {house_number} {postcode} {city} {town} {village} {hamlet} {state} {country} */
					'city'		=> __( '{postcode} {city} {town} {village} {hamlet}', 'acf-openstreetmap-field' ),
					/* translators: address format for marker labels (country level). Available placeholders {building} {road} {house_number} {postcode} {city} {town} {village} {hamlet} {state} {country} */
					'country'	=> __( '{state} {country}', 'acf-openstreetmap-field' ),
				]
			],
		];

		/* frontend */
		wp_register_script( 'acf-osm-frontend', $this->get_asset_url( 'assets/js/acf-osm-frontend.js' ), [ ], $this->get_version(), [
			'strategy'  => 'defer',
			'in_footer' => true,
		] );
		wp_localize_script( 'acf-osm-frontend', 'acf_osm', $osm_l10n );

		wp_register_style( 'leaflet', $this->get_asset_url( 'assets/css/acf-osm-leaflet.css' ), [], $this->get_version() );

		/* backend */

		// field js
		wp_register_script( 'acf-input-osm', $this->get_asset_url('assets/js/acf-input-osm.js'), ['acf-input','wp-backbone' ], $this->get_version(), [
			// 'strategy'  => 'defer',
			'in_footer' => true,
		] );
		wp_localize_script( 'acf-input-osm', 'acf_osm', $osm_l10n );
		wp_localize_script( 'acf-input-osm', 'acf_osm_admin', $osm_admin );
		// field css
		wp_register_style( 'acf-input-osm', $this->get_asset_url( 'assets/css/acf-input-osm.css' ), [ 'leaflet', 'acf-input', 'dashicons' ], $this->get_version() );


		// field group admin js
		wp_register_script( 'acf-field-group-osm', $this->get_asset_url('assets/js/acf-field-group-osm.js'), [ 'acf-field-group' ], $this->get_version(), [
			// 'strategy'  => 'defer',
			'in_footer' => true,
		] );

		// field group admin css
		wp_register_style( 'acf-field-group-osm', $this->get_asset_url( 'assets/css/acf-field-group-osm.css' ), [], $this->get_version() );
		wp_localize_script( 'acf-field-group-osm', 'acf_osm', $osm_l10n );
		wp_localize_script( 'acf-field-group-osm', 'acf_osm_admin', $osm_admin );


		// settings js
		wp_register_script( 'acf-osm-settings', $this->get_asset_url( 'assets/js/acf-osm-settings.js' ), [], $this->get_version() );
		wp_localize_script( 'acf-osm-settings', 'acf_osm', $osm_l10n );

		// settings css
		wp_register_style( 'acf-osm-settings', $this->get_asset_url( 'assets/css/acf-osm-settings.css' ), ['leaflet'], $this->get_version() );
	}

	/**
	 *	Get asset url for this plugin
	 *
	 *	@param	string	$asset	URL part relative to plugin class
	 *	@return wp_enqueue_editor
	 */
	public function get_asset_url( $asset ) {
		return plugins_url( $asset, $this->get_plugin_file() );
	}
}

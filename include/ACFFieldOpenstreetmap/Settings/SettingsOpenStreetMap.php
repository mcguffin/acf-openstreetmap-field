<?php

namespace ACFFieldOpenstreetmap\Settings;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;

class SettingsOpenStreetMap extends Settings {

	use Traits\UIElements;
	use Traits\ProviderSettings;
	use Traits\GeocoderSettings;

	private $optionset = 'acf_osm';

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {

		$core = Core\Core::instance();

		// TODO: add features
		// add_option( 'acf_osm_features', [
		// 	'acf_field'      => true,
		// 	'geo_json_feed'  => false,
		// 	'geo_post_types' => [
		// 		'post' => true,  // one post = one geojson object
		// 		'page' => false,
		// 	],
		// ], '', true );

		add_option( 'acf_osm_geocoder', $this->geocoder_defaults, '', true );

		add_option( 'acf_osm_provider_tokens', [], '', false );
		add_option( 'acf_osm_providers', $this->get_default_option_providers(), '', false );
		add_option( 'acf_osm_proxy', [], '', false );

		add_action( 'admin_menu', [ $this, 'admin_menu' ] );
		add_action( "load-settings_page_acf_osm", [ $this, 'enqueue_assets' ] );

		add_filter( 'plugin_action_links_'.$core->get_wp_plugin(), [ $this, 'plugin_actions_links' ], 20, 4 );

		parent::__construct();

	}

	/**
	 *	@filter plugin_action_links_{$plugin_file}
	 */
	public function plugin_actions_links( $actions, $plugin_file, $plugin_data, $context ) {
		if ( isset( $plugin_data['Name'] ) && current_user_can( 'manage_options' ) ) {
			$actions['settings'] = sprintf(
				'<a href="%s" aria-label="%s">%s</a>',
				esc_url(
					add_query_arg(
						[ 'page' => $this->optionset ],
						admin_url( 'options-general.php' )
					)
				),
				/* translators: %s: Plugin name. */
				esc_attr( sprintf( _x( '%s Settings', 'plugin', 'acf-openstreetmap-field' ), $plugin_data['Name'] ) ),
				__( 'Settings', 'acf-openstreetmap-field' )
			);
		}
		return $actions;
	}

	/**
	 *	Add Settings page
	 *
	 *	@action admin_menu
	 */
	public function admin_menu() {
		$page_hook = add_options_page( __('OpenStreetMap Settings' , 'acf-openstreetmap-field' ),__('OpenStreetMap' , 'acf-openstreetmap-field'),'manage_options', $this->optionset, [ $this, 'settings_page' ] );
	}

	/**
	 *	Render Settings page
	 */
	public function settings_page() {

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.' ) );
		}

		$core = Core\Core::instance();
		$providers = Core\LeafletProviders::instance();

		?>
		<div class="wrap acf-osm-settings-wrap">
			<h2><?php esc_html_e('ACF OpenStreetMap', 'acf-openstreetmap-field') ?></h2>

			<form action="options.php" method="post">
				<?php settings_fields( $this->optionset ); ?>
				<?php /*
				<input class="screen-reader-text" id="acf-osm-tab-1" type="radio" name="acf_osm_view" checked />
				*/ ?>
				<input class="screen-reader-text" id="acf-osm-tab-2" type="radio" name="acf_osm_view" checked />
				<input class="screen-reader-text" id="acf-osm-tab-3" type="radio" name="acf_osm_view" />
				<h2 class="nav-tab-wrapper">
					<?php /*
					<label for="acf-osm-tab-1" class="nav-tab">
						<?php esc_html_e('Options', 'acf-openstreetmap-field') ?>
					</label>
					*/ ?>
					<label for="acf-osm-tab-2" type="button" class="nav-tab">
						<?php esc_html_e('Providers', 'acf-openstreetmap-field') ?>
					</label>
					<label for="acf-osm-tab-3" type="button" class="nav-tab">
						<?php esc_html_e('Geocoder', 'acf-openstreetmap-field') ?>
					</label>
				</h2>
				<?php // Future
				/*
				<div class="tab-content acf-osm-tab-1">
					<h3><?php esc_html_e('Plugin Options', 'acf-openstreetmap-field') ?></h3>
					<div class="acf-osm-plugin-settings">
						<?php
						// enable ACF-Field
						// enable geodata for post type

						?>
					</div>
				</div>
				*/ ?>
				<div class="tab-content acf-osm-tab-2">
					<h3><?php esc_html_e('Map Tile Provider Settings', 'acf-openstreetmap-field') ?></h3>
					<?php $this->providers_description(); ?>
					<div class="acf-osm-settings">
						<div class="acf-osm-provider-settings">
						<?php

						$provider_settings = $providers->get_providers( [], true );

						foreach ( $provider_settings as $provider_key => $provider_data ) {

							$this->print_provider_setting( $provider_key, $provider_data );

						}

						?>
						</div>
						<div class="acf-osm-test-map-container">
							<div class="acf-osm-test-map">
								<div
									data-test="providers"
									data-map="leaflet"
									data-map-lat="53.55064"
									data-map-lng="10.00065"
									data-map-zoom="12"
									data-map-layers="<?php echo esc_attr( json_encode(['OpenStreetMap.Mapnik']) ); ?>"
									>
								</div>
							</div>
						</div>
					</div>

				</div>
				<div class="tab-content acf-osm-tab-3">
					<?php $this->print_geocoder_settings(); ?>
				</div>

				<?php
				submit_button( __('Save Settings' , 'acf-openstreetmap-field' ) );
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Enqueue settings Assets
	 *
	 *	@action load-settings_page_acf_osm
	 */
	public function enqueue_assets() {
		$core = Core\Core::instance();
		$core->register_assets();

		// registering in Core\Core does not work ... why?
		wp_enqueue_script( 'acf-osm-settings' );
		wp_enqueue_style( 'acf-osm-settings' );
	}

	/**
	 *	Setup options.
	 *
	 *	@action admin_init
	 */
	public function register_settings() {

		$this->register_settings_providers();
		$this->register_settings_geocoder();

	}

	/**
	 *	@return array Disable tile providers with bounds
	 */
	private function get_default_option_providers() {

		$providers = Core\LeafletProviders::instance();
		$is_https = strpos( get_option('home'), 'https:' ) === 0;
		$provider_settings = $providers->get_providers(['credentials']);
		$default_option = [];

		foreach ( $provider_settings as $provider_key => $provider_data ) {
			if ( $this->has_bounds( $provider_data ) || ( $is_https && $this->is_insecure( $provider_data ) ) ) {
				$default_option[ $provider_key ] = '0';
				continue;
			}
			if ( isset( $provider_data['variants'] ) ) {
				foreach ( $provider_data['variants'] as $variant_key => $variant_data ) {
					if ( $this->has_bounds( $variant_data ) || ( $is_https && $this->is_insecure( $variant_data ) )) {
						$default_option[ $provider_key ]['variants'][$variant_key] = '0';
					}
				}
			}
		}
		return $default_option;
	}
}

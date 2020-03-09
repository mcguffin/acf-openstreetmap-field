<?php

namespace ACFFieldOpenstreetmap\Settings;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

use ACFFieldOpenstreetmap\Core;

class SettingsOpenStreetMap extends Settings {

	private $optionset = 'acf_osm';


	/**
	 *	@inheritdoc
	 */
	protected function __construct() {

		$core = Core\Core::instance();

		add_option( 'acf_osm_provider_tokens', array(), '', false );
		add_option( 'acf_osm_providers', $this->get_default_option_providers(), '', false );

		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( "load-settings_page_acf_osm", array( $this, 'enqueue_assets' ) );

		add_filter( 'plugin_action_links_'.$core->get_wp_plugin(), [ $this, 'plugin_actions_links' ], 20, 4 );

		parent::__construct();

	}

	/**
	 *	@filter plugin_action_links_{$plugin_file}
	 */
	public function plugin_actions_links( $actions, $plugin_file, $plugin_data, $context ) {
		if ( current_user_can( 'manage_options' ) ) {
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
		$page_hook = add_options_page( __('OpenStreetMap Settings' , 'acf-openstreetmap-field' ),__('OpenStreetMap' , 'acf-openstreetmap-field'),'manage_options', $this->optionset, array( $this, 'settings_page' ) );


	}

	/**
	 *	Render Settings page
	 */
	public function settings_page() {

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.' ) );
		}

		$core = Core\Core::instance();

		?>
		<div class="wrap">
			<h2><?php esc_html_e('ACF OpenStreetMap Settings', 'acf-openstreetmap-field') ?></h2>

			<form action="options.php" method="post">
				<?php
				settings_fields( $this->optionset );
				$this->providers_description();
				?>
				<div class="acf-osm-settings">
					<div class="acf-osm-provider-settings">
					<?php

					$provider_settings = $core->get_layer_providers();

					foreach ( $provider_settings as $provider_key => $provider_data ) {

						$this->print_provider_setting( $provider_key, $provider_data );

					}

					?>
					</div>
					<div class="acf-osm-test-map-container">
						<div class="acf-osm-test-map">
							<div
								data-map="leaflet"
								data-map-lat="53.55064"
								data-map-lng="10.00065"
								data-map-zoom="12"
								data-map-layers="<?php esc_attr_e( json_encode(['OpenStreetMap']) ); ?>"
								>
							</div>
						</div>
					</div>
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
		/*
		wp_enqueue_style( 'acf-osm-settings', $core->get_asset_url( 'assets/css/acf-osm-settings.css' ), array(), $core->get_version() );
		/*/
		// registering in Core\Core does not work ... why?
		wp_enqueue_script( 'acf-osm-settings' );
		wp_enqueue_style( 'acf-osm-settings' );
		//*/
	}


	/**
	 *	Setup options.
	 *
	 *	@action admin_init
	 */
	public function register_settings() {

		$core = Core\Core::instance();

		$settings_section	= 'acf_osm_settings';

		add_settings_section(
			$settings_section,
			__( 'Map Layer Settings', 'acf-openstreetmap-field' ),
			array( $this, 'tokens_description' ),
			$this->optionset
		);

		register_setting( $this->optionset, 'acf_osm_provider_tokens', array( $this , 'sanitize_provider_tokens' ) );
		register_setting( $this->optionset, 'acf_osm_providers', array( $this , 'sanitize_providers' ) );

	}

	/**
	 *	Print layer tags
	 */
	private function print_tags( $options ) {

		$tag = '<span title="%s" class="%s">%s</span>';

		if ( $this->is_insecure( $options ) ) {
			$is_https = strpos( get_option('home'), 'https:' ) === 0;
			printf(
				$tag,
				__( 'The map tiles are loaded through an insecure http connection.', 'acf-openstreetmap-field' ),
				'acf-osm-tag' . ( $is_https ? ' warn' : '' ),
				__( 'Insecure', 'acf-openstreetmap-field' )
			);
		}
		if ( $this->is_overlay( $options ) ) {
			printf(
				$tag,
				__( 'This is an overlay to be displayed over a base map.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				__( 'Overlay', 'acf-openstreetmap-field' )
			);
		}
		if ( $this->has_bounds( $options ) ) {
			printf(
				$tag,
				__( 'Only available for a specific region.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				__( 'Bounds', 'acf-openstreetmap-field' )
			);
		}
		if ( isset( $options['options']['minZoom'] ) && isset( $options['options']['maxZoom'] ) ) {
			printf( $tag,
				__( 'Zoom is restricted.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				/* translators: 1: min zoom value, 2: max zoom value */
				sprintf( __( 'Zoom: %1$d–%2$d', 'acf-openstreetmap-field' ), $options['options']['minZoom'], $options['options']['maxZoom'] )
			);
		} else if ( isset( $options['options']['minZoom'] ) ) {
			printf( $tag,
				__( 'Zoom levels are restricted.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				/* translators: min zoom value */
				sprintf( __( 'Min Zoom: %d', 'acf-openstreetmap-field' ), $options['options']['minZoom'] )
			);

		} else if ( isset( $options['options']['maxZoom'] ) ) {
			printf( $tag,
				__( 'Zoom levels are restricted.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				/* translators: max zoom value */
				sprintf( __( 'Max Zoom: %d', 'acf-openstreetmap-field' ), $options['options']['maxZoom'] )
			);
		}
	}

	/**
	 *	Whether a map tile provider is insecure.
	 *
	 *	@param array $options Map provider options
	 *	@return boolean
	 */
	private function is_insecure( $options ) {
		return is_array($options) && isset( $options['url'] ) && strpos( $options['url'], 'http:' ) === 0;
	}

	/**
	 *	Whether a map tile provider has bounds
	 *
	 *	@param array $options Map provider options
	 *	@return boolean
	 */
	private function has_bounds( $options ) {
		return is_array($options) && isset( $options['options']['bounds'] );
	}

	/**
	 *	Whether a map tile is overlay.
	 *
	 *	@param array $options Map provider options
	 *	@return boolean
	 */
	private function is_overlay( $options ) {
		return is_array($options) && isset( $options['isOverlay'] ) && $options['isOverlay'];;
	}

	/**
	 *	@param string $key Provider key
	 */
	private function print_test_link( $key ) {
		?>
		<a href="#" data-layer="<?php esc_attr_e( $key ) ?>" class="action-test">
			<?php _e('Test', 'acf-openstreetmap-field' ); ?>
		</a>
		<?php
	}




	/**
	 * Print some documentation for the optionset
	 */
	public function providers_description() {

		?>
		<div class="inside">
			<p class="description"><?php _e( 'Select which map tile providers you like to be selectable in the ACF Field.' , 'acf-openstreetmap-field' ); ?></p>
			<p class="description"><?php _e( 'Configure Access Tokens for various Map Tile providers.' , 'acf-openstreetmap-field' ); ?></p>
		</div>
		<?php
	}

	/**
	 *	@param string $provider_key
	 *	@param array $provider_data
	 */
	public function print_provider_setting( $provider_key, $provider_data ) {

//		@list( $provider_key, $provider_data ) = array_values( $args );
		$provider_option = get_option( 'acf_osm_providers' );

		$needs_access_key = false;
		$is_parent_disabled = isset( $provider_option[$provider_key] ) && $provider_option[$provider_key] === false;
		$needs_access_key = $this->needs_access_token( $provider_key, $provider_data );
		?>
		<div class="acf-osm-setting acf-osm-setting-provider <?php echo $is_parent_disabled ? 'disabled' : ''; ?>">

			<h3><?php

				echo $provider_key;
				if ( ! $needs_access_key ) {

					$this->print_tags( $provider_data );
					$this->print_test_link( $provider_key );

				}
			?></h3>
			<?php

			if ( ! $needs_access_key ) {

				?>
				<div class="acf-osm-setting-base">
					<label>
					<?php

					printf('<input class="osm-disable" type="checkbox" name="%s" value="0" %s />',
						sprintf('acf_osm_providers[%s]',
							esc_attr( $provider_key )
						),
						checked( $is_parent_disabled, true, false )
					);
					/* trnaslators: %s map tile provider name */
					printf( __('Disable %s', 'acf-openstreeetmap-field' ), $provider_key );
					?>
					</label>
				</div>
				<?php

				// disable variants
				if ( isset( $provider_data['variants'] ) ) {

					?>
					<div class="acf-osm-setting-layer-variant">
						<h4><em><?php _e('Disable Layer variants', 'acf-openstreetmap-field' ); ?></em></h4>
						<div class="acf-osm-layer-variants">
						<?php
						foreach ( $provider_data['variants'] as $variant_key => $variant ) {

							if ( is_array($variant) && ! count($variant)) {
								continue;
							}

							$is_disabled = isset( $provider_option[ $provider_key ]['variants'][ $variant_key ] )
											&& $provider_option[$provider_key]['variants'][$variant_key] === false;

							?>
							<div class="acf-osm-setting layer-variant <?php echo $is_disabled ? 'disabled' : ''; ?>">
								<label>
									<?php

									printf('<input class="osm-disable" type="checkbox" name="%s" value="0" %s />',
										sprintf('acf_osm_providers[%s][variants][%s]',
											$this->sanitize_key_case($provider_key),
											$this->sanitize_key_case($variant_key)
										),
										checked( $is_disabled, true, false)
									);

									echo $variant_key;
									$this->print_test_link( "{$provider_key}.{$variant_key}" );

									?>
								</label>
								<div class="tools">
									<?php

									$this->print_tags( $variant );

									?>
								</div>
							</div>
							<?php
						}
						?></div>
					</div>
					<?php
				}
			}

			$this->print_access_token_inputs( $provider_key, $provider_data );


			?>
		</div>
		<?php

	}

	/**
	 *	Whether an access key needs to be entered to make this provider work.
	 *
	 *	@param string $provider_key
	 *	@param Array $provider_data
	 *	@return boolean Whether this map provider requires an access key and the access key is not configured yet
	 */
	private function needs_access_token( $provider_key, $provider_data ) {
		$token_option = get_option( 'acf_osm_provider_tokens' );
		foreach ( $provider_data['options'] as $option => $value ) {
			if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) ) {
				if (
					! isset( $token_option[ $provider_key ][ 'options' ][ $option ] )
					|| empty( $token_option[ $provider_key ][ 'options' ][ $option ] )
				) {
					return true;
				}

			}
		}
		return false;

	}

	/**
	 *	Print access token input fields
	 *
	 *	@param string $provider_key
	 *	@param Array $provider_data
	 */
	private function print_access_token_inputs( $provider_key, $provider_data ) {

		?>
		<div class="inside">
			<p><?php esc_html_e( 'Enter Access Tokens for various Map Tile providers.' , 'acf-openstreetmap-field' ); ?></p>
		</div>
		<?php
	}

	/**
	 * Output Theme selectbox
	 */
	public function access_token_input( $args ) {

		@list( $field_name, $value ) = array_values( $args );
		$field_id = sanitize_title( $field_name );

		if ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) {
			$value = '';
		}

		printf('<input id="%1$s" type="text" name="%2$s" value="%3$s" class="large-text code" />',
			esc_attr($field_id),
			esc_attr($field_name),
			esc_attr($value)
		);

	}

	/**
	 * Sanitize value of setting_1
	 *
	 * @return string sanitized value
	 */
	public function sanitize_provider_tokens( $new_values ) {
		$core = Core\Core::instance();
		$token_options = $core->get_provider_token_options();
		$prev_values = get_option('acf_osm_provider_tokens');
		$values = array();

		foreach ( $token_options as $provider => $provider_data ) {
			$values[$provider] = array();
			foreach ( $provider_data as $section => $config ) {
				$values[$provider][$section] = array();
				foreach( $config as $key => $value ) {
					$prev_token = '';
					if ( isset( $prev_values[$provider][$section][$key] ) ) {
						$prev_token = $prev_values[$provider][$section][$key];
					}

					//
					if ( isset( $new_values[$provider][$section][$key] ) ) {
						// '' or '*****' or 'a-z0-9.-_+...'
						$access_token = trim( $new_values[$provider][$section][$key] );
						if ( preg_match( '/^([\*]+)$/', $access_token ) !== 0 ) {
							// use old token
							$values[$provider][$section][$key] = $prev_token;
						} else { //
							// new token OR token was deleted
							$values[$provider][$section][$key] = $access_token;
						}

					} else {
						// no token entered
						$values[$provider][$section][$key] = $prev_token;

					}
				}
			}
		}

		return $values;
	}

	/**
	 *	@param string $key
	 *	@return string
	 */
	private function sanitize_key_case( $key ) {
		return preg_replace( '/[^A-Za-z0-9_\-]/', '', $key );
	}
	/**
	 *
	 */
	public function sanitize_providers( $values ) {
		try {
			$values = array_map( array( $this, 'boolval_recursive' ), (array) $values );
		} catch ( \Exception $err ) {
			$values = array();
		}
		return $values;
	}

	private function boolval_recursive( $val ) {
		if ( $val === '0' ) {
			return false;
		} else if ( is_array( $val ) ) {
			return array_map( array( $this, 'boolval_recursive' ), $val );
		}
		throw( new \Exception('invalid value') );
	}

	/**
	 *	@return array Disable tile providers with bounds
	 */
	private function get_default_option_providers() {

		$core = Core\Core::instance();
		$is_https = strpos( get_option('home'), 'https:' ) === 0;
		$provider_settings = $core->get_layer_providers();
		$default_option = array();
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

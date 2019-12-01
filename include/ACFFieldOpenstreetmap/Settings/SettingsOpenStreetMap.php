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


		add_option( 'acf_osm_provider_tokens', array(), '', false );
		add_option( 'acf_osm_providers', $this->get_default_option_providers(), '', false );

		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( "load-settings_page_acf_osm", array( $this, 'enqueue_assets' ) );

		parent::__construct();

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
			wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
		}

		$core = Core\Core::instance();

		?>
		<div class="wrap">
			<h2><?php _e('ACF OpenStreetMap Field Settings', 'acf-openstreetmap-field') ?></h2>

			<form action="options.php" method="post">
				<?php
				settings_fields( $this->optionset );
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

		$tag = '<span title="%s" class="acf-osm-tag">%s</span>';

		$is_overlay = isset( $options['isOverlay'] ) && $options['isOverlay'];

		if ( $is_overlay ) {
			printf( 
				$tag, 
				__( 'This is an overlay to be displayed over a base map.', 'acf-openstreetmap-field' ),
				__( 'Overlay', 'acf-openstreetmap-field' ) 
			);
		}
		if ( isset( $options['options']['bounds'] ) ) {
			printf( 
				$tag, 
				__( 'Only available for a specific region.', 'acf-openstreetmap-field' ),
				__( 'Bounds', 'acf-openstreetmap-field' ) 
			);
		}
		if ( isset( $options['options']['minZoom'] ) && isset( $options['options']['maxZoom'] ) ) {
			printf( $tag, 
				__( 'Zoom is restricted.', 'acf-openstreetmap-field' ),
				/* translators: 1: min zoom value, 2: max zoom value */
				sprintf( __( 'Zoom: %1$d–%2$d', 'acf-openstreetmap-field' ), $options['options']['minZoom'], $options['options']['maxZoom'] )
			);
		} else if ( isset( $options['options']['minZoom'] ) ) {
			printf( $tag, 
				__( 'Zoom is restricted.', 'acf-openstreetmap-field' ),
				/* translators: min zoom value */
				sprintf( __( 'Min Zoom: %d', 'acf-openstreetmap-field' ), $options['options']['minZoom'] )
			);
			
		} else if ( isset( $options['options']['maxZoom'] ) ) {
			printf( $tag, 
				__( 'Zoom is restricted.', 'acf-openstreetmap-field' ),
				/* translators: max zoom value */
				sprintf( __( 'Max Zoom: %d', 'acf-openstreetmap-field' ), $options['options']['maxZoom'] )
			);	
		}
	}
	
	private function print_test_link( $key ) {
		?>
		<a href="#" data-layer="<?php esc_attr_e( $key ) ?>" class="action-test">
			<?php _e('Test', 'acf-openstreetmap-field' ); ?>
		</a>
		<?php
	}

	/**
	 *	@param array $args
	 */
	public function print_provider_setting( $provider_key, $provider_data ) {

//		@list( $provider_key, $provider_data ) = array_values( $args );
		$token_option = get_option( 'acf_osm_provider_tokens' );
		$provider_option = get_option( 'acf_osm_providers' );

		$needs_access_key = false;
		?>
		<div class="acf-osm-setting acf-osm-setting-provider">
			<?php
			// access key - find in $provider_data['options']['<something>']
			foreach ( $provider_data['options'] as $option => $value ) {

				if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) ) {
					$current_value = '';
					$needs_access_key = true;
					if ( isset( $token_option[ $provider_key ][ 'options' ][ $option ] ) ) {
						$current_value = $token_option[ $provider_key ][ 'options' ][ $option ];
						$needs_access_key = empty( trim( $current_value ) );
					}
					?>
						<div class="acf-osm-setting acf-osm-setting-access-key">
							<h4><?php printf( '%s %s', $provider_key, $option); ?></h4>
							<label>
								<?php
							
							printf('<input type="text" name="%s" value="%s" class="large-text code" placeholder="%s" />',
								sprintf('acf_osm_provider_tokens[%s][options][%s]', 
									esc_html($provider_key), 
									esc_html($option) 
								),
								esc_attr($current_value),
								esc_attr($value)
							);
							?></label>
						</div>
						<?php
					//break;
				}
			}

			if ( ! $needs_access_key ) {
					
				?>
				<div class="acf-osm-setting acf-osm-setting-base">

					<h4><?php 
						echo $provider_key;

						$this->print_tags( $provider_data );
						$this->print_test_link( $provider_key );

					?></h4>
					<label>
					<?php

					printf('<input type="checkbox" name="%s" value="0" %s />',
						sprintf('acf_osm_providers[%s]', 
							esc_attr( $provider_key )
						),
						checked( isset( $provider_option[$provider_key] ) && $provider_option[$provider_key] === false, true, false )
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
					<div class="acf-osm-setting acf-osm-setting-layer-variant">
						<h4><?php _e('Disable Layer variants', 'acf-openstreetmap-field' ); ?></h4>
						<div class="acf-osm-layer-variants">
						<?php
						foreach ( $provider_data['variants'] as $variant_key => $variant ) {

							if ( is_array($variant) && ! count($variant)) {
								continue;
							}

							?>
							<div class="layer-variant">
								<label>
									<?php

									$is_disabled = isset( $provider_option[ $provider_key ]['variants'][ $variant_key ] ) 
													&& $provider_option[$provider_key]['variants'][$variant_key] === false;
									printf('<input type="checkbox" name="%s" value="0" %s />',
										sprintf('acf_osm_providers[%s][variants][%s]', 
											esc_attr($provider_key), 
											esc_attr($variant_key)
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

			?>
		</div>
		<?php
		
	}


	/**
	 * Print some documentation for the optionset
	 */
	public function tokens_description( $args ) {

		?>
		<div class="inside">
			<p><?php _e( 'Enter Access Tokens for various Map Tile providers.' , 'acf-openstreetmap-field' ); ?></p>
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
	public function sanitize_provider_tokens( $token_values ) {
		$core = Core\Core::instance();
		$token_options = $core->get_provider_token_options();
		$values = array();

		foreach ( $token_options as $provider => $provider_data ) {
			$values[$provider] = array();
			foreach ( $provider_data as $section => $config ) {
				$values[$provider][$section] = array();
				foreach( $config as $key => $value ) {
					if ( isset( $token_values[$provider][$section][$key] )) {
						$values[$provider][$section][$key] = $token_values[$provider][$section][$key];
					} else {
						$values[$provider][$section][$key] = '';
					}
				}
			}
		}
		return $values;
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

		$provider_settings = $core->get_layer_providers();
		$default_option = array();
		foreach ( $provider_settings as $provider_key => $provider_data ) {
			if ( isset( $provider_data['options']['bounds'] ) ) {
				$default_option[ $provider_key ] = '0';
				continue;
			}
			if ( isset( $provider_data['variants'] ) ) {
				foreach ( $provider_data['variants'] as $variant_key => $variant_data ) {
					if ( is_array( $variant_data ) && isset( $variant_data['options']['bounds'] ) ) {
						$default_option[ $provider_key ]['variants'][$variant_key] = '0';
					}
				}
			}
		}
		return $default_option;
	}


}

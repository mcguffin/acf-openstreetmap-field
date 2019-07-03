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


//		add_option( 'acf-field-openstreetmap_setting_1' , 'Default Value' , '' , False );
		add_option( 'acf_osm_provider_tokens' , array() , '' , False );

		add_action( 'admin_menu', array( &$this, 'admin_menu' ) );

		parent::__construct();

	}

	/**
	 *	Add Settings page
	 *
	 *	@action admin_menu
	 */
	public function admin_menu() {
		add_options_page( __('OpenStreetMap Settings' , 'acf-field-openstreetmap' ),__('OpenStreetMap' , 'acf-field-openstreetmap'),'manage_options',$this->optionset, array( $this, 'settings_page' ) );
	}

	/**
	 *	Render Settings page
	 */
	public function settings_page() {

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
		}

		?>
		<div class="wrap">
			<h2><?php _e('acf-field-openstreetmap Settings', 'acf-field-openstreetmap') ?></h2>

			<form action="options.php" method="post">
				<?php
				settings_fields(  $this->optionset );
				do_settings_sections( $this->optionset );
				submit_button( __('Save Settings' , 'acf-field-openstreetmap' ) );
				?>
			</form>
		</div><?php
	}


	/**
	 * Enqueue settings Assets
	 *
	 *	@action load-options-{$this->optionset}.php

	 */
	public function enqueue_assets() {

	}


	/**
	 *	Setup options.
	 *
	 *	@action admin_init
	 */
	public function register_settings() {

		$core = Core\Core::instance();

		$settings_section	= 'acf_osm_settings';

		add_settings_section( $settings_section, __( 'Access Tokens', 'acf-field-openstreetmap' ), array( $this, 'tokens_description' ), $this->optionset );

		// more settings go here ...
		$option_name		= 'acf_osm_provider_tokens';

		register_setting( $this->optionset, $option_name, array( $this , 'sanitize_provider_tokens' ) );

		$option_value = get_option( $option_name, array() );

		$token_options = $core->get_provider_token_options();
		$token_values = array_replace_recursive( $core->get_provider_token_options(), $option_value );

		foreach ( $token_options as $provider => $provider_data ) {

			$field_name = $option_name . sprintf( '[%s]', $provider );

			foreach ( $provider_data as $section => $config ) {
				$field_name .= sprintf( '[%s]', $section );
				foreach( $config as $key => $value ) {

					if ( isset( $token_values[$provider][$section][$key] )) {
						$value = $token_values[$provider][$section][$key];
					}

					add_settings_field(
						$option_name.'-'.$provider.'-'.$key,
						sprintf( '%s (%s)',
							$provider,
							ucwords(implode(' ', preg_split('/([_-]+)/',$key ) ))
						),
						array( $this, 'access_token_input' ),
						$this->optionset,
						$settings_section,
						array(
							'field_name'			=> sprintf( '%s[%s]', $field_name, $key ),
							'value'					=> $value,
						)
					);


				}
			}
		}
	}


	/**
	 * Print some documentation for the optionset
	 */
	public function tokens_description( $args ) {

		?>
		<div class="inside">
			<p><?php _e( 'Enter Access Tokens for various Map Tile providers.' , 'acf-field-openstreetmap' ); ?></p>
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

		printf('<input id="%1$s" name="%2$s" value="%3$s" class="code widefat" />',
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


}

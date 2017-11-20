<?php

/*  Copyright 2017  Jörn Lund

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License, version 2, as
    published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

// exit if accessed directly
if( ! defined( 'ABSPATH' ) ) exit;

// check if class already exists
if( ! class_exists('acf_plugin_open_street_map_settings') ) :

class acf_plugin_open_street_map_settings {

	private $settings_page = 'open_street_map_api_keys';
	private $optionset = 'open_street_map';

	private $plugin = null;

	private static $_instance = null;

	public static function instance() {
		if ( is_null( self::$_instance ) ) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	/*
	*  __construct
	*
	*  This function will setup the class functionality
	*
	*  @type	function
	*  @date	17/02/2016
	*  @since	1.0.0
	*
	*  @param	n/a
	*  @return	n/a
	*/

	private function __construct() {

		add_action( 'admin_init' , array( $this, 'register_settings' ) );

		add_option( 'acf_osm_provider_tokens' , array() , '' , False );

		add_action( 'admin_menu', array( $this, 'admin_menu' ) );

		$this->plugin = acf_plugin_open_street_map::instance();

	}

	/**
	 *	Add Settings page
	 *
	 *	@action admin_menu
	 */
	public function admin_menu() {
		add_options_page( __('OpenStreetMap', 'acf-open-street-map' ),__('OpenSrtreetMap', 'acf-open-street-map'),'manage_options', $this->optionset, array( $this, 'settings_page' ) );
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
			<h2><?php _e('Open Street Map', 'acf-open-street-map') ?></h2>

			<form action="options.php" method="post">
				<?php
				settings_fields(  $this->optionset );
				do_settings_sections( $this->optionset );
				submit_button( __('Save Settings' , 'acf-open-street-map' ) );
				?>
			</form>
		</div><?php
	}




	/**
	 *	Setup options.
	 *
	 *	@action admin_init
	 */
	public function register_settings() {

		$settings_section	= 'acf_osm_settings';

		add_settings_section( $settings_section, __( 'Access Tokens', 'acf-open-street-map' ), array( $this, 'tokens_description' ), $this->optionset );



		// more settings go here ...
		$option_name		= 'acf_osm_provider_tokens';

		register_setting( $this->optionset, $option_name, array( $this , 'sanitize_provider_tokens' ) );

		$option_value = get_option( $option_name, array() );
		$token_options = $this->plugin->get_provider_token_options();
		$token_values = array_replace_recursive( $this->plugin->get_provider_token_options(), $option_value );

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
			<p><?php _e( 'Enter Access Tokens for various Map Tile providers.' , 'acf-open-street-map' ); ?></p>
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
		$token_options = $this->plugin->get_provider_token_options();
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

acf_plugin_open_street_map_settings::instance();

endif;

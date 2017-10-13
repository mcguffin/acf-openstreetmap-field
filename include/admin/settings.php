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

		add_option( 'generic_setting_1' , array() , '' , False );

		add_action( 'admin_menu', array( $this, 'admin_menu' ) );

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
			<h2><?php _e('Generic Settings', 'generic') ?></h2>

			<form action="options.php" method="post">
				<?php
				settings_fields(  $this->optionset );
				do_settings_sections( $this->optionset );
				submit_button( __('Save Settings' , 'generic' ) );
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

		add_settings_section( $settings_section, __( 'Section #1',  'acf-open-street-map' ), array( $this, 'section_1_description' ), $this->optionset );



		// more settings go here ...
		$option_name		= 'generic_setting_1';
		register_setting( $this->optionset , $option_name, array( $this , 'sanitize_setting_1' ) );
		add_settings_field(
			$option_name,
			__( 'Setting #1',  'acf-open-street-map' ),
			array( $this, 'setting_1_ui' ),
			$this->optionset,
			$settings_section,
			array(
				'option_name'			=> $option_name,
				'option_label'			=> __( 'Setting #1',  'acf-open-street-map' ),
				'option_description'	=> __( 'Setting #1 description',  'acf-open-street-map' ),
			)
		);
	}

	/**
	 * Print some documentation for the optionset
	 */
	public function section_1_description( $args ) {

		?>
		<div class="inside">
			<p><?php _e( 'Section 1 Description.' , 'generic' ); ?></p>
		</div>
		<?php
	}

	/**
	 * Output Theme selectbox
	 */
	public function setting_1_ui( $args ) {

		@list( $option_name, $label, $description ) = array_values( $args );

		$option_value = get_option( $option_name );

		?>
			<label for="<?php echo $option_name ?>">
				<input type="text" id="<?php echo $option_name ?>" name="<?php echo $option_name ?>" value="<?php esc_attr_e( $option_value ) ?>" />
				<?php echo $label ?>
			</label>
			<?php
			if ( ! empty( $description ) ) {
				printf( '<p class="description">%s</p>', $description );
			}
			?>
		<?php
	}

	/**
	 * Sanitize value of setting_1
	 *
	 * @return string sanitized value
	 */
	public function sanitize_setting_1( $value ) {
		// do sanitation here!
		return $value;
	}
}

acf_plugin_open_street_map_settings::instance();

endif;

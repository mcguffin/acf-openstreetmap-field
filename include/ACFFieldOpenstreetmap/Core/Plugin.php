<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


use ACFFieldOpenstreetmap\PostType;
use ACFFieldOpenstreetmap\Compat;

class Plugin extends Singleton {

	private $plugin_meta;


	private static $components = array(
	);

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {

		register_activation_hook( ACF_FIELD_OPENSTREETMAP_FILE, array( __CLASS__ , 'activate' ) );
		register_deactivation_hook( ACF_FIELD_OPENSTREETMAP_FILE, array( __CLASS__ , 'deactivate' ) );
		register_uninstall_hook( ACF_FIELD_OPENSTREETMAP_FILE, array( __CLASS__ , 'uninstall' ) );

		add_action( 'admin_init', array( $this, 'maybe_upgrade' ) );

		parent::__construct();
	}

	/**
	 *	@return plugin version
	 */
	public function version() {
		if ( is_null( $this->plugin_meta ) ) {
			$this->plugin_meta = get_plugin_data( ACF_FIELD_OPENSTREETMAP_FILE );
		}
		return $this->plugin_meta['Version'];
	}

	/**
	 *	@action plugins_loaded
	 */
	public function maybe_upgrade() {
		// trigger upgrade
		$meta = get_plugin_data( ACF_FIELD_OPENSTREETMAP_FILE );
		$new_version = $meta['Version'];
		$old_version = get_option( 'acf-field-openstreetmap_version' );

		// call upgrade
		if ( version_compare($new_version, $old_version, '>' ) ) {

			$this->upgrade( $new_version, $old_version );

			update_option( 'acf-field-openstreetmap_version', $new_version );

		}

	}

	/**
	 *	Fired on plugin activation
	 */
	public static function activate() {

		$meta = get_plugin_data( ACF_FIELD_OPENSTREETMAP_FILE );
		$new_version = $meta['Version'];

		update_site_option( '_version', $new_version );

		foreach ( self::$components as $component ) {
			$comp = $component::instance();
			$comp->activate();
		}


	}


	/**
	 *	Fired on plugin updgrade
	 *
	 *	@param string $nev_version
	 *	@param string $old_version
	 *	@return array(
	 *		'success' => bool,
	 *		'messages' => array,
	 * )
	 */
	public function upgrade( $new_version, $old_version ) {

		$result = array(
			'success'	=> true,
			'messages'	=> array(),
		);

		foreach ( self::$components as $component ) {
			$comp = $component::instance();
			$upgrade_result = $comp->upgrade( $new_version, $old_version );
			$result['success'] 		&= $upgrade_result['success'];
			$result['messages'][]	=  $upgrade_result['message'];
		}

		return $result;
	}

	/**
	 *	Fired on plugin deactivation
	 */
	public static function deactivate() {
		foreach ( self::$components as $component ) {
			$comp = $component::instance();
			$comp->deactivate();
		}
	}

	/**
	 *	Fired on plugin deinstallation
	 */
	public static function uninstall() {
		foreach ( self::$components as $component ) {
			$comp = $component::instance();
			$comp->unistall();
		}
	}

}

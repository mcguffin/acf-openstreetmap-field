<?php

namespace AcfOpenstreetmapField\Core;

use AcfOpenstreetmapField\PostType;
use AcfOpenstreetmapField\Compat;

class Plugin extends Singleton {

	private static $components = array(
	);

	/**
	 *	Private constructor
	 */
	protected function __construct() {

		register_activation_hook( ACF_OPENSTREETMAP_FIELD_FILE, array( __CLASS__ , 'activate' ) );
		register_deactivation_hook( ACF_OPENSTREETMAP_FIELD_FILE, array( __CLASS__ , 'deactivate' ) );
		register_uninstall_hook( ACF_OPENSTREETMAP_FIELD_FILE, array( __CLASS__ , 'uninstall' ) );

		parent::__construct();
	}

	/**
	 *	Fired on plugin activation
	 */
	public static function activate() {

		// trigger upgrade
		$meta = get_plugin_data( ACF_OPENSTREETMAP_FIELD_FILE );
		$new_version = $meta['Version'];
		$old_version = get_site_option( 'calendar_importer_version' );

		update_site_option( '_version', $new_version );

		foreach ( self::$components as $component ) {
			$comp = $component::instance();
			$comp->activate();
		}

		// call upgrade
		if ( version_compare($new_version, $old_version, '>' ) ) {

			self::upgrade( $new_version, $old_version );

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
	public static function upgrade( $new_version, $old_version ) {

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

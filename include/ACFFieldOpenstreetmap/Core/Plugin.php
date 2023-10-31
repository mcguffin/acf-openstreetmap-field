<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


use ACFFieldOpenstreetmap\PostType;
use ACFFieldOpenstreetmap\Compat;

class Plugin extends PluginComponent {

	/** @var string plugin main file */
	private $plugin_file;

	/** @var array metadata from plugin file */
	private $plugin_meta;

	/** @var string version */
	private $_version = null;

	/** @var string plugin components which might need upgrade */
	private static $components = [];

	/**
	 *	@inheritdoc
	 */
	protected function __construct( $file ) {

		$this->plugin_file = $file;

		register_activation_hook( $this->get_plugin_file(), [ $this , 'activate' ] );
		register_deactivation_hook( $this->get_plugin_file(), [ $this , 'deactivate' ] );
		register_uninstall_hook( $this->get_plugin_file(), [ __CLASS__, 'uninstall' ] );

		add_action( 'admin_init', [ $this, 'maybe_upgrade' ] );
		add_filter( 'extra_plugin_headers', [ $this, 'add_plugin_header' ] );

		add_action( 'plugins_loaded', [ $this , 'load_textdomain' ] );

		parent::__construct();
	}

	/**
	 *	@filter extra_plugin_headers
	 */
	public function add_plugin_header( $headers ) {
		$headers['GithubRepo'] = 'Github Repository';
		return $headers;
	}

	/**
	 *	@return string full plugin file path
	 */
	public function get_plugin_file() {
		return $this->plugin_file;
	}

	/**
	 *	@param string $file Path within plugin directory
	 *	@return boolean|string file contents, false on failure
	 */
	public function read_file( $file ) {


		$core = Core::instance();

		$path = wp_normalize_path( $core->get_plugin_dir() . '/' . $file );

		if ( file_exists( $path ) ) {
			return file_get_contents( $path );
		}

		return false;
	}

	/**
	 *	@return string full plugin file path
	 */
	public function get_plugin_dir() {
		return plugin_dir_path( $this->get_plugin_file() );
	}

	/**
	 *	@return string plugin slug
	 */
	public function get_slug() {
		return basename( $this->get_plugin_dir() );
	}

	/**
	 *	@return string Path to the main plugin file from plugins directory
	 */
	public function get_wp_plugin() {
		return plugin_basename( $this->get_plugin_file() );
	}

	/**
	 *	@return string current plugin version
	 */
	public function get_version() {
		if ( is_null( $this->_version ) ) {
			$this->_version = include_once $this->get_plugin_dir() . '/include/version.php';
		}
		return $this->_version;
	}

	/**
	 *	@param string $which Which plugin meta to get. NUll
	 *	@return string|array plugin meta
	 */
	public function get_plugin_meta( $which = null ) {
		if ( ! isset( $this->plugin_meta ) ) {
			if ( ! function_exists('get_plugin_data') ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			$this->plugin_meta = get_plugin_data( $this->get_plugin_file() );
		}
		if ( isset( $this->plugin_meta[ $which ] ) ) {
			return $this->plugin_meta[ $which ];
		}
		return $this->plugin_meta;
	}

	/**
	 *	@action plugins_loaded
	 */
	public function maybe_upgrade() {
		// trigger upgrade
		$new_version = $this->get_version();
		$old_version = get_site_option( 'acf-openstreetmap-field_version' );

		// call upgrade
		if ( version_compare($new_version, $old_version, '>' ) ) {

			$this->upgrade( $new_version, $old_version );

			update_site_option( 'acf-openstreetmap-field_version', $new_version ); // TODO: store blog-wide
		}
	}

	/**
	 *	Load text domain
	 *
	 *  @action plugins_loaded
	 */
	public function load_textdomain() {
		$path = pathinfo( $this->get_wp_plugin(), PATHINFO_DIRNAME );
		load_plugin_textdomain( 'acf-openstreetmap-field', false, $path . '/languages' );
	}

	/**
	 *	Fired on plugin activation
	 */
	public function activate() {

		$this->maybe_upgrade();

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

		$result = [
			'success'	=> true,
			'messages'	=> [],
		];

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
	public function deactivate() {
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
			$comp->uninstall();
		}
	}

}

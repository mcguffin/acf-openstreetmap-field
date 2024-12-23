<?php
/**
 *	@package ACFFieldOpenstreetmap\WPCLI
 *	@version 1.0.0
 *	2018-09-22
 */

namespace ACFFieldOpenstreetmap\WPCLI\Commands;

use ACFFieldOpenstreetmap\Core;

class MapProxy extends \WP_CLI_Command {

	/**
	 * Init proxy dir in wp-content/maps/
	 *
	 * [--force]
	 * : Overwrite existing files
	 * ---
	 * default: 0
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp map-proxy install
	 */
	public function install( $args, $assoc_args ) {
		$assoc_args = wp_parse_args($assoc_args, [
			'force' => false,
		]);
		$proxy      = Core\MapProxy::instance();
		$result     = $proxy->setup_proxy_dir( $assoc_args['force'] );
		if ( is_wp_error( $result ) ) {
			\WP_CLI::error( $result->get_error_message() );
		} else {
			\WP_CLI::success(  "Create proxy directory in wp-content/maps/" );
		}
	}

	/**
	 * remove proxy dir in wp-content/maps/
	 *
	 * ## EXAMPLES
	 *
	 *     wp map-proxy uninstall
	 *
	 */
	public function uninstall( $args, $assoc_args ) {
		$proxy  = Core\MapProxy::instance();
		$result = $proxy->reset_proxy_dir();
		if ( is_wp_error( $result ) ) {
			\WP_CLI::error( $result->get_error_message() );
		} else {
			\WP_CLI::success(  "Removed proxy directory" );
		}
	}

	/**
	 * Generate local proxy configuration
	 *
	 * ## EXAMPLES
	 *
	 *     wp map-proxy configure
	 *
	 */
	public function configure( $args, $assoc_args ) {

		$proxy  = Core\MapProxy::instance();
		$result = $upload_dir = wp_upload_dir( null, false );
		$proxy->save_proxy_config( $upload_dir['basedir'] );

		if ( is_wp_error( $result ) ) {
			\WP_CLI::error( $result->get_error_message() );
		} else {
			\WP_CLI::success(  "Create proxy config in ". $upload_dir['basedir'] );
		}
	}
}

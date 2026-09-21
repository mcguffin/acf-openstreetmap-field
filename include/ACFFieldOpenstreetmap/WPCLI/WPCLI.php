<?php
/**
 *	@package ACFFieldOpenstreetmap\WPCLI
 *	@version 1.0.0
 *	2018-09-22
 */

namespace ACFFieldOpenstreetmap\WPCLI;

use ACFFieldOpenstreetmap\Core;

class WPCLI extends Core\Singleton {

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		\WP_CLI::add_command( 'map-proxy install', [ new Commands\MapProxy(), 'install' ], [
			'shortdesc'		=> 'Install map proxy directory',
			'is_deferred'	=> false,
		] );
		\WP_CLI::add_command( 'map-proxy uninstall', [ new Commands\MapProxy(), 'uninstall' ], [
			'shortdesc'		=> 'remove map proxy directory',
			'is_deferred'	=> false,
		] );
		\WP_CLI::add_command( 'map-proxy configure', [ new Commands\MapProxy(), 'configure' ], [
			'shortdesc'		=> 'Save local map proxy configuration',
			'is_deferred'	=> false,
		] );
	}
}

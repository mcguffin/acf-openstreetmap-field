<?php
/**
 *	@package ACFFieldOpenstreetmap\Core
 *	@version 1.0.0
 *	2018-09-22
 */

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


abstract class Singleton {

	/**
	 * Array containing derived class instances
	 */
	private static $instances = array();

	/**
	 * Getting a singleton.
	 *
	 * @return object single instance of Core
	 */
	public static function instance() {

		$class = get_called_class();

		if ( ! isset( self::$instances[ $class ] ) ) {
			$args = func_get_args();
			self::$instances[ $class ] = new $class( ...$args );
		}

		return self::$instances[ $class ];
	}

	/**
	 *	Prevent Instantinating
	 */
	private function __clone() { }
	private function __wakeup() { }

	/**
	 *	Protected constructor
	 */
	protected function __construct() {
	}
}

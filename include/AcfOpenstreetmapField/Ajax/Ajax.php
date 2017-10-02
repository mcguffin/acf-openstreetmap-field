<?php

namespace AcfOpenstreetmapField\Ajax;
use AcfOpenstreetmapField\Core;

class Ajax extends Core\Singleton {
	
	private static $handlers = array();
	
	public static function register_action( $action, $args = array() ) {
		if ( ! isset( self::$handlers[ $action ] ) ) {
			self::$handlers[ $action ] = new AjaxHandler( $action, $args );
		}
		return self::$handlers[ $action ];
	}

	public static function unregister_action( $action ) {

		if ( isset( self::$handlers[ $action ] ) ) {
			unset( self::$handlers[ $action ] );
		}
	
	}
	
}
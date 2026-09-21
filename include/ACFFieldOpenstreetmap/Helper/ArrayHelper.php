<?php

namespace ACFFieldOpenstreetmap\Helper;

class ArrayHelper {

	/**
	 *	@param array $array
	 *	@param callable $callback
	 *	@return array
	 */
	public static function filter_recursive( $array, $callback = 'boolval' ) {
		$array = array_map( function( $value ) use ( $callback ) {
			if ( $callback($value) ) {
				if ( is_array( $value ) ) {
					return self::filter_recursive( $value, $callback );
				}
				return $value;
			}
			return false;
		}, $array );
		return array_filter( $array, $callback );
	}
}

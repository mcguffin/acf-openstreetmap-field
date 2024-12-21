<?php

namespace ACFFieldOpenstreetmap\Helper;

class ArrayHelper {

	public static function filter_recursive( $array, $callback = 'boolval' ) {
		return array_filter( $array, function($value) use ( $callback ) {
			if ( is_array( $value ) ) {
				return self::filter_recursive( $value, $callback );
			}
			return $callback($value);
		});

	}
}

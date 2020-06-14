<?php

namespace ACFFieldOpenstreetmap\Helper;

class MapHelper {
	const EARTH_RADIUS = 6378137;

	public static function getCoordOffset( $what, $lat, $lon, $offset) {
	    $earthRadius = 6378137;
	    $coord = [0 => $lat, 1 => $lon];

	    $radOff = $what === 0 ? $offset / self::EARTH_RADIUS : $offset / (self::EARTH_RADIUS * cos(M_PI * $coord[0] / 180));
	    return $coord[$what] + $radOff * 180 / M_PI;
	}

	public static function getBBox($lat, $lon, $zoom ) {

		$offset = self::zoomToOffset( $zoom );

		return [
		    0 => self::getCoordOffset(1, $lat, $lon, -$offset),
		    1 => self::getCoordOffset(0, $lat, $lon, -$offset),
		    2 => self::getCoordOffset(1, $lat, $lon, $offset),
		    3 => self::getCoordOffset(0, $lat, $lon, $offset),
		]; // 0 = minlon, 1 = minlat, 2 = maxlon, 3 = maxlat, 4,5 = original val (marker)
	}

	public static function zoomToOffset( $zoom ) {

		return ( self::EARTH_RADIUS * M_PI * 2 ) / pow( 2, $zoom );

	}
}

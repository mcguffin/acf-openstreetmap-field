<?php

namespace ACFFieldOpenstreetmap\Helper;

class MapHelper {
	/** @const Int planet radius in meters */
	const EARTH_RADIUS = 6378137;

	/**
	 *	Add Offset in meters to a latitude or longitude
	 *
	 *	@param Int $what 0: latitude, 1: longitude
	 *	@param Float $lat
	 *	@param Float $lon
	 *	@param Float $offset Value to add in meters
	 *
	 *	@return Float
	 */
	public static function getCoordOffset( $what, $lat, $lon, $offset ) {

		$coord = [ 0 => $lat, 1 => $lon ];

		$radOff = $what === 0
			? $offset / self::EARTH_RADIUS
			: $offset / ( self::EARTH_RADIUS * cos( M_PI * $coord[0] / 180 ) );

		return $coord[$what] + $radOff * 180 / M_PI;
	}

	/**
	 *	Convert lat/lng/zoom coordinates to bounding box
	 *
	 *	@param Float $lat
	 *	@param Float $lon
	 *	@param Float $zoom
	 *
	 *	@return Array [
	 *		0 => (Float) MinLng,
	 *		1 => (Float) MinLat,
	 *		2 => (Float) MaxLng,
	 *		3 => (Float) MaxLat,
	 *	]
	 */
	public static function getBBox($lat, $lon, $zoom ) {

		$offset = self::zoomToOffset( $zoom );

		return [
			0 => self::getCoordOffset(1, $lat, $lon, -$offset),
			1 => self::getCoordOffset(0, $lat, $lon, -$offset),
			2 => self::getCoordOffset(1, $lat, $lon, $offset),
			3 => self::getCoordOffset(0, $lat, $lon, $offset),
		]; // 0 = minlon, 1 = minlat, 2 = maxlon, 3 = maxlat, 4,5 = original val (marker)
	}

	/**
	 *	Get fraction of Earth's Perimeter that should be visible at zoom level
	 *
	 *	@param Int $zoom
	 *
	 *	@return Float
	 */
	public static function zoomToOffset( $zoom ) {

		return ( self::EARTH_RADIUS * M_PI * 2 ) / pow( 2, $zoom );

	}
}

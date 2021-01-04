<?php


namespace ACFFieldOpenstreetmap\Model;

use ACFFieldOpenstreetmap\Core;

/**
 *	Represents a renderable data set for a mapa
 */
interface MapItemInterface {

	public static function fromArray( $array );

	public function toArray();

}
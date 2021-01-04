<?php

namespace ACFFieldOpenstreetmap\Model;

use ACFFieldOpenstreetmap\Core;

/**
 *	Represents a map Layer
 */
class MapMarkerLayer extends MapLayer {

	const TYPE = 'markers';

	/**
	 *	@inheritdoc
	 */
	public function __construct( $type, $config ) {
		// make 
		$config = (array) $config;
		$config = array_map( [ 'ACFFieldOpenstreetmap\Model\MapMarker', 'fromArray' ], $config )

		parent::__construct( $type, $config );		
	}

	/**
	 *	@inheritdoc
	 */
	public function toArray() {
		
		$array = parent::toArray();

		$array['config'] = array_map( function( $marker ) {
			return $marker->toArray();
		}, $array['config'] );
		
		return $array;
	}


}

MapLayer::registerType( 'ACFFieldOpenstreetmap\Model\MapMarkerLayer' );


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
	public function __construct( $type, array $config ) {
		// make 
		$config = wp_parse_args($config, [
			'markers' => [],
		]);
		$config['markers'] = array_map( [ 'ACFFieldOpenstreetmap\Model\MapMarker', 'fromArray' ], $config['markers'] );

		parent::__construct( $type, $config );		
	}

	/**
	 *	@inheritdoc
	 */
	public function toArray() {
		
		$array = parent::toArray();

		$array['markers'] = array_map( function( $marker ) {
			return $marker->toArray();
		}, $array['markers'] );
		
		return $array;
	}


}

MapLayer::registerType( 'ACFFieldOpenstreetmap\Model\MapMarkerLayer' );


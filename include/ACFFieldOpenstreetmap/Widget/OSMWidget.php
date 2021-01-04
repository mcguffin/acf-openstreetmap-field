<?php


namespace ACFFieldOpenstreetmap\Widget;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Model;

class OSMWidget extends AbstractMapWidget {
	
	protected $map_type = 'osm';
	
	/**
	 *	@inheritdoc
	 */
	public function __construct() {
		$opts = [
			'classname' => 'open-street-map',
			'description' => __( 'An OpenStreetMap iFrame', 'acf-openstreetmap-field' ),
		];
		
		parent::__construct( 'open_street_map', __( 'OpenStreetMap', 'acf-openstreetmap-field' ), $opts );
	}

}


<?php


namespace ACFFieldOpenstreetmap\Widget;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Model;

class LeafletWidget extends AbstractMapWidget {

	protected $map_type = 'leaflet';

	/**
	 *	@inheritdoc
	 */
	public function __construct() {
		$opts = [
			'classname' => 'open-street-map',
			'description' => __( 'An interactive Leaflet Map', 'acf-openstreetmap-field' ),
		];
		
		parent::__construct( 'leaflet_map', __( 'Leaflet Map', 'acf-openstreetmap-field' ), $opts );
	}
	

}


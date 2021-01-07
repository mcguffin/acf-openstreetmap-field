<?php

namespace ACFFieldOpenstreetmap\Model;

use ACFFieldOpenstreetmap\Core;

/**
 *	Represents a map Layer
 */
class MapMarker implements MapItemInterface {
	
	/** @var Float lnggitude */
	private $lng;
	
	/** @var Float latitude */
	private $lat;
	
	/** @var String label (user input) */
	private $label;
	
	/** @var String default label (before user input) */
	private $default_label; 

	// private $geodata; // what the geocoder returned	
	
	public static function fromArray( $array ) {
		
		$array = wp_parse_args( $array, [
			'lat' => 0,
			'lng' => 0,
			'label' => '',
			'default_label' => '',
			'data' => [], // keys: geocode, location, acf_googlemaps
		] );
		
	}

	/**
	 *	@param Float $lng
	 *	@param Float $lat
	 *	@param String $label
	 *	@param String $default_label
	 */
	protected function __construct( $lat, $lng, $label, $default_label ) {
		$this->lat = (float) $lat;
		$this->lng = (float) $lng;
		$this->label = (string) $label;
		$this->default_label = (string) $default_label;

		// sanitize data
		$this->label = wp_kses_post( $this->label );
		$this->default_label = wp_kses_post( $this->default_label );

	}

	
	/**
	 *
	 *	@return Array [
	 *		'lng' => Float,
	 *		'lat' => Float,
	 *		'label' => String,
	 *		'default_label' => String,
	 *	]
	 */
	public function toArray() {
		return [
			'lng' => $this->lng,
			'lat' => $this->lat,
			'label' => $this->label,
			'default_label' => $this->default_label,
		];
	}


}
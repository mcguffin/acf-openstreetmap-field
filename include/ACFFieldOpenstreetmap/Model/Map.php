<?php


namespace ACFFieldOpenstreetmap\Model;

use ACFFieldOpenstreetmap\Core;

/**
 *	Represents a renderable data set for a mapa
 */
class Map implements MapItemInterface {

	/** @var Float latitude */
	private $lat;
	
	/** @var Float lnggitude */
	private $lng;
	
	/** @var Int zoom 0..22 */
	private $zoom;

	/** @var Int */
	private $height;

	/** @var MapLayers[] */
	private $layers = [];

	/**
	 *	@param MapItemInterface $item
	 *	@return Array representation of item
	 */
	private function toArrayCallback( $item ) {
		return $item->toArray();
	}

	/**
	 *	Create Map instance from array
	 *
	 *	@param Array $array
	 *	@return Map Instance
	 */
	public static function fromArray( $array ) {

		$array = wp_parse_args( $array, [
			'lat' => 0,
			'lng' => 0,
			'zoom' => 0,
			'height' => 400,
			'layers' => [],
			'version' => '0.0.0',
		] );

		if ( version_compare( $array['version'], '1.4.0', '<' ) ) {
			return self::fromLegacyArray( $array );
		} else if ( isset( $array['place_id'] ) ) {
			return self::fromACFGoogleMapsField( $array );
		}

		$array['layers'] = array_map( [ 'ACFFieldOpenstreetmap\Model\MapLayer', 'fromArray' ], $array['layers'] );
		$array['version'] = Core\Core::instance()->get_version();

		return new Map( $array['lat'], $array['lng'], $array['zoom'], $array['height'], $array['layers'], $array['version'] );
	}

	/**
	 *	Create Map instance from Legacy Array
	 *
	 *	@param Array $legacy_array [
	 *		'lat' => 0,
	 *		'lng' => 0,
	 *		'zoom' => 0,
	 *		'layers' => [ 0 => 'MapProvider.mapVariant' ],
	 *		'markers' => [ [ 'lat' => ..., 'lng' => ..., 'label' => ..., ...] ],
	 * ]
	 *	@return Map Instance
	 */
	public static function fromLegacyArray( $legacy_array ) {

		$array = wp_parse_args( $legacy_array, [
			'lat' => 0,
			'lng' => 0,
			'zoom' => 0,
			'layers' => [],
			'markers' => [],
		] );


		// convert settings from <= 1.0.1 > display only?
		if ( isset( $array['center_lat'] ) ) {
			if ( ( ! isset( $array['lat'] ) || empty( $array['lat'] ) ) && ! empty( $array['center_lat'] ) ) {
				$array['lat'] = $array['center_lat'];
			}
			unset( $array['center_lat'] );
		}

		if ( isset( $array['center_lng'] ) ) {
			if ( ( ! isset( $array['lng'] ) || empty( $array['lng'] ) ) && ! empty( $array['center_lng'] ) ) {
				$array['lng'] = $array['center_lng'];
			}
			unset( $legacy_array['center_lng'] );
		}

		// convert markers
		$marker_layer = new MapLayer( 'markers', $array['markers'] );
		unset( $array['markers'] );

		// generate layers
		$array['layers'] = array_map( function( $layer_config ) {
			if ( is_string( $layer_config ) ) {
				$layer = MapLayer::fromArray( ['type' => 'provider', 'config' => $layer_config, ] );
			} else if ( is_array( $layer_config ) && isset( $layer_config['type'] ) ) {
				$layer = MapLayer::fromArray( $layer_config );
			} else {
				return null;
			}
			return $layer->toArray();
		}, $array['layers'] );

		$array['layers'][] = $marker_layer->toArray();
		$array['version'] = Core\Core::instance()->get_version();

		return Map::fromArray( $array );
	}

	/**
	 *	@param Array 
	 */
	public static function fromACFGoogleMapsField( $gm_array ) {
		// 
		$array = wp_parse_args( $gm_array, [
			'address' => '',
		] );
		$array['layers'] = [
			[ 'type' => 'provider', 'config' => 'OpenStreetMap.Mapnik' ],
			[ 'type' => 'markers', 'config' => [
				[ 
					'lat' => $gm_array['lat'], 
					'lng' => $gm_array['lng'], 
					'label' => $gm_array['address'], 
					'default_label' => $gm_array['address'] ],
					'data' => array_diff_key( $gm_array, [ 'lat' => '', 'lng' => '', 'zoom' => '', 'address' => '' ] ),
			] ]
		];
		$array['version'] = Core\Core::instance()->get_version();
		return Map::fromArray( $array );
	}

	/**
	 *	@param Float $lng
	 *	@param Float $lat
	 *	@param Int $zoom
	 *	@param Array $layers
	 */
	protected function __construct( $lat, $lng, $zoom, $height, $layers, $version ) {
		$this->lat = (float) $lat;
		$this->lng = (float) $lng;
		$this->zoom = (int) $zoom;
		$this->height = (int) $height;
		$this->layers = (array) $layers;
		$this->version = $version;
		
		// sanitation
		$this->zoom = min( 22, max( 0, intval( $this->zoom ) ) );
	}


	/**
	 *	Get Array representation (with typed layers)
	 *
	 *	@return Array [
	 *		'lng' => Float,
	 *		'lat' => Float,
	 *		'zoom' => Integer,
	 *		'layers' => [
	 *			[ 'type' => String, 'config' => Mixed ],
	 *			...
 	 *		],
	 *	]
	 */
	public function toArray() {
		return [
			'lng' => $this->lng,
			'lat' => $this->lat,
			'zoom' => $this->zoom,
			'height' => $this->height,
			'layers' => array_map( [ $this, 'toArrayCallback' ], $this->layers ),
			'version' => $this->version,
		];
	}

	/**
	 *	@return Array [ 'Provider.variant', 'AnotherProvider.variant', ... ]
	 */
	public function getProviders() {
		$providers = [];
		foreach ( $this->layers as $layer ) {
			if ( 'provider' === $layer->type ) {
				$providers[] = $layer->config;
			}
		}
		return $providers;
	}

	/**
	 *	@param Array [ 'Provider.variant', 'AnotherProvider.variant', ... ]
	 *	@return Map $this
	 */
	public function setProviders( $providers ) {
		// remove providers
		$provider_layers = array_map( function($provider) {
			return MapLayer::fromArray( ['type' => 'provider', 'config' => $provider, ] );
		}, $providers );

		$this->layers = array_merge(
			$provider_layers,

			array_filter( $this->layers, function($layer) {
				return $layer->type !== 'provider';
			} )			
		);
	}

	/**
	 *	@return Array [
 	 *			[ 'lng' => (float), 'lng' => (float) ... ], 
	 *			...
 	 *	]
	 */
	public function getMarkers() {
		$markers = [];

		foreach ( $this->layers as $layer ) {
			if ( 'markers' === $layer->type ) {
				$markers = array_merge( $markers, $layer->toArray()['config'] );
			}
		}
		return $markers;
	}

	/**
	 *	Get Legacy Array representation (with layers and markers)
	 *
	 *	@return Array [
	 *		'lng' => Float,
	 *		'lat' => Float,
	 *		'zoom' => Integer,
	 *		'layers' => [ 
	 *			'Provider.variant', 
	 *			... 
 	 *		],
	 *		'markers' => [
	 *			[ 'lng' => Float, ... ]
	 *		],
	 *	]
	 */
	public function toLegacyArray() {

		/*
		add center_lng, center_lat, address!
		*/
		return [
			'lng' => $this->lng,
			'lat' => $this->lat,
			'zoom' => $this->zoom,
			'layers' => $this->getProviders(),
			'markers' => $this->getMarkers(),
		];
	}

}


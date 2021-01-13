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

	/*
	// ToDo:
	/** @var Array global map bounds * /
	private $bounds;

	/** @var Int * /
	private $min_zoom;

	/** @var Int * /
	private $max_zoom;
	*/

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
		$marker_layer = new MapLayer( 'markers', [ 'markers' => $array['markers']] );
		unset( $array['markers'] );

		// generate layers
		$array['layers'] = array_map( function( $layer_config ) {
			if ( is_string( $layer_config ) ) {
				// add provider layer
				$layer = MapLayer::fromArray( ['type' => 'provider', 'provider' => $layer_config, ] );
			} else if ( is_array( $layer_config ) && isset( $layer_config['type'] ) ) {
				// 
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
			[ 'type' => 'provider', 'provider' => 'OpenStreetMap.Mapnik' ],
			[ 'type' => 'markers', 'markers' => [
				[ 
					'lat' => $gm_array['lat'], 
					'lng' => $gm_array['lng'], 
					'label' => $gm_array['address'], 
					'default_label' => $gm_array['address'],
					'data' => [ 'acf_google_map' => $gm_array ],
				],					
			] ]
		];
		$array['version'] = Core\Core::instance()->get_version();
		$array = array_intersect_key( $array, [
			'lng' => '',
			'lat' => '',
			'zoom' => '',
			'height' => '',
			'layers' => [],
			'version' => '',
		] );

		return Map::fromArray( $array );
	}

	/**
	 *	@param Float $lng
	 *	@param Float $lat
	 *	@param Int $zoom
	 *	@param Int $height
	 *	@param Array $layers
	 *	@param String $version
	 */
	protected function __construct( $lat, $lng, $zoom, $height, $layers, $version ) {
		$this->lat = (float) $lat;
		$this->lng = (float) $lng;
		$this->zoom = (int) $zoom;
		$this->height = (int) $height;
		$this->layers = (array) $layers;
		$this->version = (string) $version;
		
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
	 *			[ 'type' => String, 'prop1' => Mixed, 'prop2' => Mixed, ... ],
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
		$providers = array_filter( $this->layers, function($layer) {
			return 'provider' === $layer->type;
		} );
		return array_map( function($layer) {
			return $layer->provider;
		}, $providers );
	}

	/**
	 *	@return Array [ 'Provider.variant', 'AnotherProvider.variant', ... ]
	 */
	public function hasProviders() {
		count( array_filter( $this->layers, function($layer) {
			return 'provider' === $layer->type;
		} ) ) > 0;
	}

	/**
	 *	@param Array [ 'Provider.variant', 'AnotherProvider.variant', ... ]
	 *	@return Map $this
	 */
	public function setProviders( $providers ) {
		// remove providers
		$provider_layers = array_map( function($provider) {
			return MapLayer::fromArray( ['type' => 'provider', 'provider' => $provider, ] );
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
				$markers = array_merge( $markers, $layer->toArray()['markers'] );
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

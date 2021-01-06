<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

use ACFFieldOpenstreetmap\Helper;
use ACFFieldOpenstreetmap\Model;

class OSMProviders extends Singleton {
	/** @var array mapping of OSM link layers to leaflet layers */
	private $link_layers = [
		'H' => 'OpenStreetMap.HOT',
		'T' => 'Thunderforest.Transport',
		'C' => 'Thunderforest.OpenCycleMap',
	];
	
	/** @var array mapping of OSM iframe layers to leaflet layers */
	private $iframe_layers = [
		'mapnik'		=> 'OpenStreetMap.Mapnik',
		'cyclemap'		=> 'Thunderforest.OpenCycleMap',
		'transportmap'	=> 'Thunderforest.Transport',
		'hot'			=> 'OpenStreetMap.HOT',
	];


	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
	}
	
	
	/**
	 *	Returns raw leaflet providers
	 *	@param array $filters credentials|enabled
	 *	@return array
	 */
	public function get_providers( $filters = [] ) {}


	public function get_token_options() {}




	/**
	 *	get default OpenStreetMap Layers
	 *
	 *	@return array(
	 *		'layer_id' => 'Layer Label',
	 *		...
	 *	)
	 */
	public function get_layers( $context = 'iframe' ) {
		/*
		mapnik
		cyclemap C 	Cycle
		transportmap T	Transport
		hot H	Humantarian
		*/
		if ( 'iframe' === $context ) {
			return $this->iframe_layers;
		} else if ( 'link' === $context ) {
			return $this->link_layers;
		}
	}

	/**
	 *	@param config array [
	 *		'lat'		: (float),
	 *		'lng'		: (float),
	 *		'markers'	: optional. 
	 *			[
	 *				'lat'		: (float),
	 *				'lng'		: (float),
 	 *			],
	 *		'layers'	: optional. any of
	 *			[
	 *				'OpenStreetMap', 
	 *				'Thunderforest.OpenCycleMap',
	 *				'Thunderforest.Transport',
	 *				'OpenStreetMap.HOT',
 	 *			],
 	 *	]
	 *	@return string URL
	 */
	public function get_iframe_url( $map ) {

		// convert to 1.4.0 model
		$config = Model\Map::fromArray( $map )->toArray();

		$bbox = Helper\MapHelper::getBbox( $config['lat'], $config['lng'], $config['zoom'] );
		$args = [
			'bbox'	=> implode( ',', $bbox ),
		];

		foreach ( $config['layers'] as $layer ) {
			$layer = wp_parse_args( $layer, [ 'type' => false ] );

			if ( 'provider' === $layer['type'] ) {
				if ( $i_layer = $this->find_map_layer_code( $layer ) ) {
					$args['layer'] = $i_layer;
				}
			// 
			}
			if ( 'markers' === $layer['type'] ) {

				foreach ( $layer['markers'] as $marker ) {
			
					$args['marker'] = implode(',', [ $marker['lat'], $marker['lng'] ] );
					break;

				}
			}
		}

		return add_query_arg( $args, 'https://www.openstreetmap.org/export/embed.html' );

	}

	private function find_map_layer_code( $map_layer ) {
		$map_layer = wp_parse_args( $map_layer, [
			'provider' => false,
		] );

		return array_search( $map_layer['provider'], $this->iframe_layers );		
	}

	private function find_link_layer_code( $map_layer ) {
		$map_layer = wp_parse_args( $map_layer, [
			'provider' => false,
		] );

		return array_search( $map_layer['provider'], $this->link_layers );

	}


	/**
	 *	@param config array [
	 *		'lat'		: (float),
	 *		'lng'		: (float),
	 *		'markers'	: optional. 
	 *			[
	 *				'lat'		: (float),
	 *				'lng'		: (float),
 	 *			],
	 *		'layers'	: optional. any of
	 *			[
	 *				'OpenStreetMap', 
	 *				'Thunderforest.OpenCycleMap',
	 *				'Thunderforest.Transport',
	 *				'OpenStreetMap.HOT',
 	 *			],
 	 *	]
	 *	@return string URL
	 */
	public function get_link_url( $map ) {

		// convert to 1.4.0 model
		$config = Model\Map::fromArray( $map )->toArray();

		$args = [];

		$link = 'https://www.openstreetmap.org/';
		$hash = 'map=' . implode( '/', [ 
			intval( $config['zoom'] ), 
			floatval( $config['lat'] ), 
			floatval( $config['lng'] ) 
		] );

		foreach ( $config['layers'] as $layer ) {
			$layer = wp_parse_args( $layer, [ 'type' => false ] );

			if ( 'provider' === $layer['type'] ) {
				
				if ( $l_layer = $this->find_link_layer_code( $layer ) ) {
					$hash .= '&layers='.$l_layer;
				}
			// 
			}
			if ( 'markers' === $layer['type'] ) {

				foreach ( $layer['markers'] as $marker ) {
					$args['mlat'] = $marker['lat'];
					$args['mlon'] = $marker['lng'];
					break;

				}
			}
		}

		$link = add_query_arg( $args, $link );

		foreach ( $config['layers'] as $layer ) {
			$l_layer = array_search( $layer, $this->link_layers );
			if ( false !== $l_layer ) {
				
				break;
			}
		}

		return $link . '#' . $hash;
	}

}
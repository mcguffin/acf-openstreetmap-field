<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

class LeafletProviders extends Singleton {

	/** @var array */
	private $leaflet_providers = null;

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
	public function get_providers( $filters = [] ) {
		$core = Core::instance();


		if ( is_null( $this->leaflet_providers ) ) {
			$this->leaflet_providers = json_decode( $core->read_file( 'etc/leaflet-providers.json' ), true );
		}

		$providers = $this->leaflet_providers;

		foreach ( (array) $filters as $filter ) {
			if ( 'credentials' === $filter ) {

				// get configured token
				$tokens = get_option( 'acf_osm_provider_tokens', [] );

				foreach ( $tokens as &$token ) {
					$token = $this->filter_recursive( $token );
					if ( empty( $token ) ) {
						$token = false;
					}
				}

				// merge tokens
				$providers = array_replace_recursive( $providers, $tokens );

				// remove providers with empty tokens
				$providers = array_filter( $providers );

				$providers = apply_filters( 'acf_osm_leaflet_providers_'.$filter, $providers );
			}

			if ( 'enabled' === $filter ) {

				// remove disabled providers
				$disabled_providers = get_option( 'acf_osm_providers', [] );

				$providers = array_replace_recursive( $providers, $disabled_providers );

				$providers = array_filter( $providers, function( $el ) {
					return $el !== '0';
				} );

				foreach ( $providers as &$provider ) {
					if ( isset( $provider['variants'] ) ) {
						// remove disabled variants
						$provider['variants'] = array_filter( $provider['variants'], function( $el ) {
							return ! in_array( $el, [ '0', false ], true );
						} );
						// remove empty variants
						if ( ! count( $provider['variants'] ) ) {
							unset( $provider['variants'] );
						}
					}
				}

			}

		}

		$providers = apply_filters( 'acf_osm_leaflet_providers', $providers );

		return $providers;

	}


	/**
	 *	Get token configuration options
	 *
	 *	@return array
	 */
	public function get_token_options() {

		$token_options = [];

		foreach ( $this->get_providers() as $provider => $data ) {
			foreach( $data['options'] as $option => $value ) {
				if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) ) { // '<insert your [some token] here>'

					if ( ! isset($token_options[ $provider ]['options'] ) ) {
						$token_options[ $provider ] = [ 'options' => [] ];
					}
					$token_options[ $provider ]['options'][ $option ] = '';
				}
			}
		}

		return $token_options;
	}



	/**
	 *	Get a flat leaflet provider list
	 *
	 *	@return array [
	 *		'provider_key' 			=> 'provider',
	 *		'provider_key.variant'	=> 'provider.variant',
	 *		...
	 * ]
	 */
	public function get_layers() {

		$providers = [];

		foreach ( $this->get_providers([ 'credentials', 'enabled' ]) as $provider_key => $provider_data ) {
			//

			if ( isset( $provider_data[ 'variants' ] ) ) {
				foreach ( $provider_data[ 'variants' ] as $variant => $variant_data ) {
					// bounded variants disabled through settings!
					// if ( ! is_string( $variant_data ) && isset( $variant_data['options']['bounds'] ) ) {
					// 	// no variants with bounds!
					// 	continue;
					// }
					$providers[ $provider_key . '.' . $variant ] = $provider_key . '.' . $variant;

					if ( is_string( $variant_data ) || isset( $variant_data['options'] ) ) {

						$providers[ $provider_key . '.' . $variant ] = $provider_key . '.' . $variant;

					} else {

				//		$providers[ $provider_key ] = $provider_key;

					}
				}
			} else {
				$providers[ $provider_key ] = $provider_key;
			}
		}

		return $providers;
	}

	public function get_layer_config() {
		return $this->filter_recursive( get_option( 'acf_osm_provider_tokens', [] ) );
	}

	/**
	 *	@param array $arr
	 *	@return array
	 */
	private function filter_recursive( $arr ) {
		foreach ( $arr as &$value ) {
			if ( is_array( $value ) ) {
				$value = $this->filter_recursive( $value );
			}
		}
		$arr = array_filter( $arr );
		return $arr;
	}


}

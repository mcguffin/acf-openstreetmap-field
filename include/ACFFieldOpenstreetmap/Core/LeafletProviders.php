<?php

namespace ACFFieldOpenstreetmap\Core;

use ACFFieldOpenstreetmap\Helper;

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
	 *	@param array $filters credentials|proxied|enabled
	 *	@param boolean $unfiltered Whether to apply filters
	 *	@return array
	 */
	public function get_providers( $filters = [], $unfiltered = false ) {
		$core      = Core::instance();
		$proxies   = MapProxy::instance()->get_proxies();

		if ( is_null( $this->leaflet_providers ) ) {
			$this->leaflet_providers = json_decode( $core->read_file( 'etc/leaflet-providers.json' ), true );
		}

		$providers = $this->leaflet_providers;

		foreach ( (array) $filters as $filter ) {
			if ( 'credentials' === $filter ) {

				// get configured token
				$tokens = get_option( 'acf_osm_provider_tokens', [] );

				// merge tokens
				$providers = array_replace_recursive( $providers, $tokens );

				// remove providers without access tokens
				$providers = array_filter( $providers, function( $provider, $provider_key ) {
					return ! $this->needs_access_token( $provider_key, $provider )
						|| $this->has_access_token( $provider_key, $provider );
				}, ARRAY_FILTER_USE_BOTH );

				if ( ! $unfiltered ) {
					$providers = apply_filters( 'acf_osm_leaflet_providers_'.$filter, $providers );
				}
			}

			if ( 'proxied' === $filter ) {

				$providers = array_filter( $providers, function( $el, $provider_key ) use ( $proxies ) {
					return in_array( $provider_key, $proxies );
				},  ARRAY_FILTER_USE_BOTH );

			}

			if ( 'enabled' === $filter ) {

				// remove disabled providers
				$disabled_providers = get_option( 'acf_osm_providers', [] );

				$providers = array_replace_recursive( $providers, $disabled_providers );

				$providers = array_filter( $providers, function( $el ) {
					return is_array( $el );
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

		if ( ! $unfiltered ) {
			$providers = apply_filters( 'acf_osm_leaflet_providers', $providers );
		}

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
	 *	Convert string variant definitions to object
	 */
	public function unify_provider_variants( $provider ) {
		if ( isset( $provider['variants'] ) ) {
			$provider['variants'] = array_map( function( $variant ) {
				if ( is_string( $variant ) ) {
					$variant = [
						'options' => [
							'variant' => $variant,
						]
					];
				}
				if ( ! isset( $variant['options'] ) ) {
					$variant['options'] = [];
				}
				return $variant;
			}, $provider['variants'] );
		}
		return $provider;
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


	/**
	 *	Whether an access key needs to be entered to make this provider work.
	 *
	 *	@param string $provider_key
	 *	@param Array $provider_data
	 *	@return boolean Whether this map provider requires an access key and the access key is not configured yet
	 */
	public function needs_access_token( $provider_key, $provider_data ) {
		foreach ( $provider_data['options'] as $option => $value ) {
			if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 *	Whether an access key needs to be entered to make this provider work.
	 *
	 *	@param string $provider_key
	 *	@param Array $provider_data
	 *	@return boolean Whether this map provider requires an access key and the access key is not configured yet
	 */
	public function has_access_token( $provider_key, $provider_data ) {
		$token_option = get_option( 'acf_osm_provider_tokens' );
		foreach ( $provider_data['options'] as $option => $value ) {
			if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value ) ) ) {
				return isset( $token_option[ $provider_key ][ 'options' ][ $option ] )
					&& ! empty( $token_option[ $provider_key ][ 'options' ][ $option ] );
			}
		}
		return false;
	}

}

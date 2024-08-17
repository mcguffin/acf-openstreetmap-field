<?php

namespace ACFFieldOpenstreetmap\Core;

use ACFFieldOpenstreetmap\Compat;

class MapProxy extends Singleton {

	/** @var array provider keys to be proxied */
	private $proxies;

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {

		$this->proxies = array_keys( array_filter( (array) get_option( 'acf_osm_proxy' ) ) );

		if ( count( $this->proxies ) ) {
			add_filter('acf_osm_leaflet_providers', [ $this, 'proxify_providers' ], 50 );
		}

		add_action( 'update_option_acf_osm_provider_tokens', [ $this, 'setup_proxies' ] );
		add_action( 'update_option_acf_osm_providers', [ $this, 'setup_proxies' ] );
		add_action( 'update_option_acf_osm_proxy', [ $this, 'setup_proxies' ] );
	}

	/**
	 *	@return array holding keys of proxied providers
	 */
	public function get_proxies() {
		return $this->proxies;
	}

	/**
	 *	Apply proxy config to all providers
	 *	@filter acf_osm_leaflet_providers
	 */
	public function proxify_providers( $providers ) {

		foreach ( $providers as $provider_key => &$provider ) {
			if ( ! in_array( $provider_key, $this->proxies ) ) {
				continue;
			}
			$provider = $this->proxify_provider( $provider_key, $provider );
		}

		return $providers;
	}

	/**
	 *	Apply proxy config to provider
	 *
	 *	@param string $provider_key
	 *	@param array $provider
	 *	@return array
	 */
	private function proxify_provider( $provider_key, $provider ) {

		// make sure variant config is an array
		$provider = LeafletProviders::instance()->unify_provider_variants( $provider );

		$provider = $this->proxify_tileset( $provider, $provider_key );

		if ( isset( $provider['variants'] ) ) {
			foreach ( $provider['variants'] as $variant_key => $variant ) {
				if ( ! isset( $variant['url'] ) ) {
					$variant['url'] = $provider['url'];
				}
				$provider['variants'][$variant_key] = $this->proxify_tileset( $variant, $provider_key, $variant_key );
			}
		}
		return $provider;
	}

	/**
	 *	Apply proxy config to provider or variant
	 *
	 *	@param string $provider_key
	 *	@param array $provider
	 *	@return array
	 */
	private function proxify_tileset( $tileset, $provider_key, $variant_key = '' ) {

		// resolution capability?
		if ( strpos( $tileset['url'], '{r}') !== false ) {
			$url_params_part = '{z}/{x}/{y}{r}';
		} else {
			$url_params_part = '{z}/{x}/{y}';
		}

		// remove unneeded props from provider (and hide access tokens on the way)
		foreach ( array_keys( $tileset['options'] ) as $option ) {
			if ( strpos( $tileset['url'], "{{$option}}") !== false ) {
				unset( $tileset['options'][$option] );
			}
		}

		// reconfigure url
		$tileset['url'] = content_url( $this->get_proxy_path( $provider_key, $variant_key ) . $url_params_part );

		return $tileset;
	}

	/**
	 *	Setup proxy directory in wp-content/ and save proxy config in uploads.
	 *
	 *	@action update_option_acf_osm_provider_tokens
	 *	@action update_option_acf_osm_providers
	 *	@action update_option_acf_osm_proxy
	 */
	public function setup_proxies() {

		if ( ! WP_Filesystem() ) {
			return false;
		}

		global $wp_filesystem;

		$this->setup_proxy_dir();

		$proxied_providers = LeafletProviders::instance()->get_providers( [ 'credentials' ], true );
		$proxy_config = [];
		foreach ( $proxied_providers as $provider_key => $provider ) {

			$provider = LeafletProviders::instance()->unify_provider_variants( $provider );

			$provider_url = $provider['url'];

			foreach ( $provider['options'] as $option => $value ) {
				if ( 'variant' === $option ) {
					continue;
				}
				if ( is_scalar( $value ) ) {
					$provider_url = str_replace( "{{$option}}", $value, $provider_url );
				}
			}
			if ( isset( $provider['subdomains'] ) ) {
				$subdomains = $provider['subdomains'];
			} else {
				$subdomains = 'abc';
			}

			$proxy_config[$provider_key] = [
				'base_url'   => $provider_url,
				'subdomains' => $subdomains,
			];

			if ( isset( $provider['variants'] ) ) {
				foreach ( $provider['variants'] as $variant_key => $variant ) {
					if ( isset( $variant['url'] ) ) {
						$variant_url = $variant['url'];
					} else {
						$variant_url = $provider_url;
					}

					foreach ( $variant['options'] as $option => $value ) {
						if ( is_scalar( $value ) ) {
							$variant_url = str_replace( "{{$option}}", $value, $variant_url );
						}
					}
					$proxy_config["{$provider_key}.{$variant_key}"] = [
						'base_url'   => $variant_url,
						'subdomains' => $subdomains,
					];
				}
			}
		}

		$upload_dir = wp_upload_dir( null, false );

		$content = '<?php' . "\n";
		$content .= '/* Generously generated by the ACF OpenStreetMap Field Plugin */' . "\n";
		$content .= sprintf(
			'return %s;' . "\n",
			var_export( $proxy_config, true )
		);

		$wp_filesystem->put_contents(
			$upload_dir['basedir'] . '/acf-osm-proxy-config.php',
			$content
		);

	}

	/**
	 *	Setup proxy directory in wp-content/maps/
	 */
	private function setup_proxy_dir() {
		global $wp_filesystem;

		$proxy_path = trailingslashit( trailingslashit( WP_CONTENT_DIR ) . $this->get_proxy_path() ) ;
		wp_mkdir_p( $proxy_path );

		if ( ! $wp_filesystem->exists( $proxy_path . '.htaccess' ) ) {
			$content = '# Generously generated by the ACF OpenStreetMap Field Plugin' . "\n";
			$content .= 'RewriteEngine On' . "\n";
			$content .= 'RewriteBase /wp-content/maps' . "\n";
			$content .= 'RewriteRule . index.php [L]' . "\n";

			$wp_filesystem->put_contents( $proxy_path . '.htaccess', $content );
		}

		if ( ! $wp_filesystem->exists( $proxy_path . 'index.php' ) ) {
			$upload_dir = wp_upload_dir( null, false );

			$content = '<?php' . "\n";
			$content .= '/* Generously generated by the ACF OpenStreetMap Field Plugin */' . "\n";
			$content .= sprintf(
				"\$proxy_config = include '%s/acf-osm-proxy-config.php';\n",
				$upload_dir['basedir']
			);
			$content .= sprintf(
				"include_once '%s/include/proxy.php';\n",
				untrailingslashit( Core::instance()->get_plugin_dir() )
			);

			$wp_filesystem->put_contents( $proxy_path . 'index.php', $content );
		}
	}

	/**
	 *	@param string $provider_key
	 *	@param string $variant_key
	 *	@return string
	 */
	private function get_proxy_path( $provider_key = '', $variant_key = '' ) {
		$path = 'maps';
		if (  $provider_key ) {
			$path .= '/'  . $provider_key;
			if ( $variant_key ) {
				$path .= '.' . $variant_key;
			}
		}
		return trailingslashit( $path );
	}

}
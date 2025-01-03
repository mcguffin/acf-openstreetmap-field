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

		add_filter( 'acf_osm_leaflet_providers', [ $this, 'proxify_providers' ], 50 );

		add_action( 'update_option_acf_osm_provider_tokens', [ $this, 'setup_proxies' ] );
		add_action( 'update_option_acf_osm_providers', [ $this, 'setup_proxies' ] );
		add_action( 'update_option_acf_osm_proxy', [ $this, 'setup_proxies' ] );
	}

	/**
	 *	@return array holding keys of proxied providers
	 */
	public function get_proxies() {
		if ( ! isset( $this->proxies ) ) {
			$this->proxies = array_keys( array_filter( (array) get_option( 'acf_osm_proxy' ) ) );
		}
		return $this->proxies;
	}

	/**
	 *	Apply proxy config to all providers
	 *	@filter acf_osm_leaflet_providers
	 */
	public function proxify_providers( $providers ) {

		$proxies = $this->get_proxies();
		$force   = apply_filters( 'acf_osm_force_proxy', false );

		foreach ( $providers as $provider_key => &$provider ) {
			if ( $force || in_array( $provider_key, $proxies ) ) {
				$provider = $this->proxify_provider( $provider_key, $provider );
			}
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

		$upload_dir = wp_upload_dir( null, false );
		$this->setup_proxy_dir();
		return $this->save_proxy_config( $upload_dir['basedir'] );

	}

	/**
	 *	Save proxy config
	 *
	 *	@param string $destination_path
	 */
	public function save_proxy_config( $destination_path ) {

		if ( ! WP_Filesystem() ) {
			return new \WP_Error( 'acf-osm', __( 'No Filesystem', 'acf-openstreetmap-field' ) );
		}

		global $wp_filesystem;

		if ( ! $wp_filesystem->is_writable( $destination_path ) ) {
			return new \WP_Error( 'acf-osm', __( 'Filesystem not writable', 'acf-openstreetmap-field' ) );
		}

		$proxied_providers = LeafletProviders::instance()->get_providers( ['credentials'], true );
		$proxy_config = [];
		foreach ( $proxied_providers as $provider_key => $provider ) {

			$provider = LeafletProviders::instance()->unify_provider_variants( $provider );

			if ( isset( $provider['options']['subdomains'] ) ) {
				$subdomains = $provider['options']['subdomains'];
			} else {
				$subdomains = 'abc';
			}

			$proxy_config[$provider_key] = [
				'base_url'   => $this->generate_url( $provider['url'], $provider['options'] ),
				'subdomains' => $subdomains,
			];

			if ( isset( $provider['variants'] ) ) {
				foreach ( $provider['variants'] as $variant_key => $variant ) {
					if ( isset( $variant['url'] ) ) {
						$variant_url = $variant['url'];
					} else {
						$variant_url = $provider['url'];
					}

					$variant_url = $this->generate_url( $variant_url, $variant['options'] );
					$variant_url = $this->generate_url( $variant_url, $provider['options'] );

					if ( isset( $variant['options']['subdomains'] ) ) {
						$variant_subdomains = $variant['options']['subdomains'];
					} else {
						$variant_subdomains = $subdomains;
					}

					$proxy_config["{$provider_key}.{$variant_key}"] = [
						'base_url'   => $variant_url,
						'subdomains' => $variant_subdomains,
					];
				}
			}
		}

		$content = '<?php' . "\n";
		$content .= '/* Generously generated by the ACF OpenStreetMap Field Plugin */' . "\n";
		$content .= sprintf(
			'return %s;' . "\n",
			var_export( $proxy_config, true )
		);

		$wp_filesystem->put_contents(
			untrailingslashit( $destination_path ) . '/acf-osm-proxy-config.php',
			$content
		);
	}

	/**
	 *	@param string $base_url
	 *	@param array $options
	 */
	private function generate_url( $base_url, $options ) {
		$url = $base_url;
		foreach ( $options as $option => $value ) {
			if ( is_scalar( $value ) ) {
				$url = str_replace( "{{$option}}", str_replace(' ', '%20', $value), $url );
			}
		}
		return $url;
	}

	/**
	 *	Setup proxy directory in wp-content/maps/
	 */
	public function setup_proxy_dir( $force = false ) {
		global $wp_filesystem;

		if ( ! WP_Filesystem() ) {
			return new \WP_Error( 'acf-osm', __( 'No Filesystem', 'acf-openstreetmap-field' ) );
		}

		$proxy_path = trailingslashit( trailingslashit( WP_CONTENT_DIR ) . $this->get_proxy_path() ) ;

		wp_mkdir_p( $proxy_path );

		if ( ! $wp_filesystem->is_writable( $proxy_path ) ) {
			return new \WP_Error( 'acf-osm', __( 'Filesystem not writable', 'acf-openstreetmap-field' ) );
		}

		if ( $force || ! $wp_filesystem->exists( $proxy_path . '.htaccess' ) ) {
			$content = '# Generously generated by ACF OpenStreetMap Field Plugin' . "\n";
			$content .= 'RewriteEngine On' . "\n";
			$content .= 'RewriteBase /wp-content/maps' . "\n";
			$content .= 'RewriteRule . index.php [L]' . "\n";

			$wp_filesystem->put_contents( $proxy_path . '.htaccess', $content );
		}

		if ( $force || ! $wp_filesystem->exists( $proxy_path . 'index.php' ) ) {
			$upload_dir = wp_upload_dir( null, false );

			$content = '<?php' . "\n";
			$content .= '/* Generously generated by ACF OpenStreetMap Field Plugin */' . "\n";
			$content .= "if ( file_exists( __DIR__ . '/acf-osm-proxy-config.php' ) ) {\n";
			$content .= "\t\$proxy_config = include __DIR__ . '/acf-osm-proxy-config.php';\n";
			$content .= "} else {\n";
			$content .= "\t\$proxy_config = [];\n";
			$content .= "}\n";
			$content .= sprintf(
				"include_once '%s/include/proxy.php';\n",
				untrailingslashit( Core::instance()->get_plugin_dir() )
			);

			$wp_filesystem->put_contents( $proxy_path . 'index.php', $content );
		}

		// save a global config
		if ( is_multisite() && ( $force || ! $wp_filesystem->exists( $proxy_path . 'acf-osm-proxy-config.php' ) ) ) {

			switch_to_blog( get_main_site_id() );

			$this->save_proxy_config( $proxy_path );

			restore_current_blog();
		}
	}

	/**
	 *	Remove Proxy Directory
	 */
	public function reset_proxy_dir() {

		if ( ! WP_Filesystem() ) {
			return new \WP_Error( 'acf-osm', __( 'No Filesystem', 'acf-openstreetmap-field' ) );
		}

		global $wp_filesystem;

		$proxy_path = trailingslashit( trailingslashit( WP_CONTENT_DIR ) . $this->get_proxy_path() ) ;

		if ( ! $wp_filesystem->is_writable( $proxy_path ) ) {
			return new \WP_Error( 'acf-osm', __( 'Filesystem not writable', 'acf-openstreetmap-field' ) );
		}

		return $wp_filesystem->rmdir( $proxy_path, true );
	}

	/**
	 *	@param string $provider_key
	 *	@param string $variant_key
	 *	@return string
	 */
	private function get_proxy_path( $provider_key = '', $variant_key = '' ) {
		$path = 'maps';
		if ( $provider_key ) {
			if ( is_multisite() && ! is_main_site() ) {
				$path .= sprintf('/sites/%d', get_current_blog_id() );
			}
			$path .= '/'  . $provider_key;
			if ( $variant_key ) {
				$path .= '.' . $variant_key;
			}
		}
		return trailingslashit( $path );
	}

}

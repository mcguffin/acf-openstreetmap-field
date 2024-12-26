<?php

namespace ACFFieldOpenstreetmap\Settings\Traits;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;

trait ProviderSettings {

	/**
	 *	Setup options.
	 */
	private function register_settings_providers() {

		$core = Core\Core::instance();

		$settings_section  = 'acf_osm_settings';

		add_settings_section(
			$settings_section,
			__( 'Map Layer Settings', 'acf-openstreetmap-field' ),
			[ $this, 'tokens_description' ],
			$this->optionset
		);

		// register_setting( $this->optionset, 'acf_osm_features', [ $this , 'sanitize_features' ] );
		register_setting( $this->optionset, 'acf_osm_provider_tokens', [ $this , 'sanitize_provider_tokens' ] );
		register_setting( $this->optionset, 'acf_osm_providers', [ $this , 'sanitize_providers' ] );
		register_setting( $this->optionset, 'acf_osm_proxy', [ $this , 'sanitize_proxy' ] );
	}

	/**
	 *	@param string $provider_key
	 *	@param array $provider_data
	 */
	public function print_provider_setting( $provider_key, $provider_data ) {

		$providers = Core\LeafletProviders::instance();

//		@list( $provider_key, $provider_data ) = array_values( $args );
		$provider_option    = get_option( 'acf_osm_providers' );
		$proxy_option       = get_option( 'acf_osm_proxy' );

		$is_parent_disabled = isset( $provider_option[$provider_key] ) && $provider_option[$provider_key] === false;
		$needs_access_key   = $providers->needs_access_token( $provider_key, $provider_data );
		$has_access_key     = $providers->has_access_token( $provider_key, $provider_data );

		?>
		<div class="acf-osm-setting acf-osm-setting-provider <?php echo $is_parent_disabled ? 'disabled' : ''; ?>">

			<h3><?php

				esc_html_e( $provider_key );
				if ( ! $needs_access_key || $has_access_key ) {

					$this->print_tags( $provider_data );
					$this->print_test_link( $provider_key );

				}
			?></h3>
			<?php

			if ( ! $needs_access_key || $has_access_key ) {

				?>
				<div class="acf-osm-setting-base">
					<label>
					<?php

					printf('<input class="osm-disable" type="checkbox" name="%s" value="0" %s />',
						sprintf('acf_osm_providers[%s]',
							esc_attr( $provider_key )
						),
						checked( $is_parent_disabled, true, false )
					);
					/* translators: %s map tile provider name */
					esc_html_e( sprintf( __('Disable %s', 'acf-openstreeetmap-field' ), $provider_key ) );
					?>
					</label>
					<?php if ( ! apply_filters( 'acf_osm_force_proxy', false ) ) { ?>
						<label class="osm-proxy-option">
						<?php

						printf('<input class="osm-proxy" type="checkbox" name="%s" value="1" %s />',
							sprintf('acf_osm_proxy[%s]',
								esc_attr( $provider_key )
							),
							checked( isset( $proxy_option[$provider_key] ) && $proxy_option[$provider_key], true, false )
						);
						/* translators: %s map tile provider name */
						esc_html_e( sprintf( __('Enable Proxy for %s (beta)', 'acf-openstreeetmap-field' ), $provider_key ) );
						?>
						</label>
					<?php } ?>
				</div>
				<?php

				// disable variants
				if ( isset( $provider_data['variants'] ) ) {

					?>
					<div class="acf-osm-setting-layer-variant">
						<h4><em><?php esc_html_e('Disable Layer variants', 'acf-openstreetmap-field' ); ?></em></h4>
						<div class="acf-osm-layer-variants">
						<?php
						foreach ( $provider_data['variants'] as $variant_key => $variant ) {

							$is_disabled = isset( $provider_option[ $provider_key ]['variants'][ $variant_key ] )
											&& in_array( $provider_option[$provider_key]['variants'][$variant_key], [ '0', false ], true );

							?>
							<div class="acf-osm-setting layer-variant <?php echo $is_disabled ? 'disabled' : ''; ?>">
								<label>
									<?php

									printf('<input class="osm-disable" type="checkbox" name="%s" value="0" %s />',
										sprintf('acf_osm_providers[%s][variants][%s]',
											$this->sanitize_key_case($provider_key), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
											$this->sanitize_key_case($variant_key) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
										),
										checked( $is_disabled, true, false)
									);

									esc_html_e( $variant_key );
									$this->print_test_link( "{$provider_key}.{$variant_key}" );

									?>
								</label>
								<div class="tools">
									<?php

									$this->print_tags( $variant );

									?>
								</div>
							</div>
							<?php
						}
						?></div>
					</div>
					<?php
				}
			}

			$this->print_access_token_inputs( $provider_key, $provider_data );

			?>
		</div>
		<?php

	}
	/**
	 *	Print access token input fields
	 *
	 *	@param string $provider_key
	 *	@param Array $provider_data
	 */
	private function print_access_token_inputs( $provider_key, $provider_data ) {

		$token_option = get_option( 'acf_osm_provider_tokens' );

		// access key - find in $provider_data['options']['<something>']
		foreach ( $provider_data['options'] as $option => $value ) {

			if ( is_string($value) && ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) ) {
				$current_value = '';
				$has_value = isset( $token_option[ $provider_key ][ 'options' ][ $option ]) && ! empty( $token_option[ $provider_key ][ 'options' ][ $option ] );
				?>
				<hr />
				<div class="acf-osm-setting acf-osm-setting-access-key">
					<h4><?php printf( '%s %s', esc_html( $provider_key ), esc_html( $option ) ); ?></h4>
					<label>
						<?php
						if ( $has_value ) {
							printf( '<em>%s %s</em>', esc_html( $option ), __( 'configured.', 'acf-openstreetmap-field' ) );
							printf( '<button class="button-link" type="button" data-action="change-token">%s</button>', __('Reset','acf-openstreetmap-field') );
							echo '<template>';
						}

						printf('<input type="text" name="%s" value="%s" class="large-text code" placeholder="%s" />',
							//empty($current_value) ? 'text' : 'password',
							sprintf('acf_osm_provider_tokens[%s][options][%s]',
								$this->sanitize_key_case($provider_key), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
								$this->sanitize_key_case($option) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							),
							esc_attr($current_value),
							esc_attr($value)
						);
						if ( $has_value ) {
							printf( '<button class="button-link" type="button" data-action="cancel-token">%s</button>', __('Cancel','acf-openstreetmap-field') );
							echo '</template>';
						}
					?></label>
				</div>
				<?php
			}
		}
	}

	/**
	 * Output Theme selectbox
	 */
	public function access_token_input( $args ) {

		@list( $field_name, $value ) = array_values( $args );
		$field_id = sanitize_title( $field_name );

		if ( 1 === preg_match( '/^<([^>]*)>$/imsU', $value, $matches ) ) {
			$value = '';
		}

		printf('<input id="%1$s" type="text" name="%2$s" value="%3$s" class="large-text code" />',
			esc_attr( $field_id ),
			esc_attr( $field_name ),
			esc_attr( $value )
		);

	}

	/**
	 * Sanitize value of setting_1
	 *
	 * @return string sanitized value
	 */
	public function sanitize_provider_tokens( $new_values ) {
		$core = Core\Core::instance();
		$providers = Core\LeafletProviders::instance();

		$token_options = $providers->get_token_options();

		$prev_values = get_option('acf_osm_provider_tokens');

		// merge new values
		$values = array_replace_recursive( $prev_values, $new_values );
		// remove empty values
		$values = Helper\ArrayHelper::filter_recursive( $values );

		return $values;
	}

	/**
	 *	Print layer tags
	 */
	private function print_tags( $options ) {

		$tag = '<span title="%s" class="%s">%s</span>';

		if ( $this->is_insecure( $options ) ) {
			$is_https = strpos( get_option('home'), 'https:' ) === 0;
			printf(
				$tag, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html__( 'The map tiles are loaded through an insecure http connection.', 'acf-openstreetmap-field' ),
				'acf-osm-tag' . ( $is_https ? ' warn' : '' ),
				esc_html__( 'Insecure', 'acf-openstreetmap-field' )
			);
		}
		if ( $this->is_overlay( $options ) ) {
			printf(
				$tag, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html__( 'This is an overlay to be displayed over a base map.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				esc_html__( 'Overlay', 'acf-openstreetmap-field' )
			);
		}
		if ( $this->has_bounds( $options ) ) {
			printf(
				$tag, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html__( 'Only available for a specific region.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				esc_html__( 'Bounds', 'acf-openstreetmap-field' )
			);
		}
		if ( isset( $options['options']['minZoom'] ) && isset( $options['options']['maxZoom'] ) ) {
			printf(
				$tag, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html__( 'Zoom is restricted.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				esc_html( sprintf(
					/* translators: 1: min zoom value, 2: max zoom value */
					__( 'Zoom: %1$d–%2$d', 'acf-openstreetmap-field' ),
					$options['options']['minZoom'], $options['options']['maxZoom']
				))
			);
		} else if ( isset( $options['options']['minZoom'] ) ) {
			printf(
				$tag, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html__( 'Zoom levels are restricted.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				esc_html( sprintf(
					/* translators: min zoom value */
					__( 'Min Zoom: %d', 'acf-openstreetmap-field' ),
					$options['options']['minZoom']
				))
			);

		} else if ( isset( $options['options']['maxZoom'] ) ) {
			printf(
				$tag, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html__( 'Zoom levels are restricted.', 'acf-openstreetmap-field' ),
				'acf-osm-tag',
				esc_html(sprintf(
					/* translators: max zoom value */
					__( 'Max Zoom: %d', 'acf-openstreetmap-field' ),
					$options['options']['maxZoom'] // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				))
			);
		}
	}

	/**
	 *
	 */
	public function sanitize_providers( $values ) {
		try {
			$values = array_map( [ $this, 'boolval_recursive' ], (array) $values );
		} catch ( \Exception $err ) {
			$values = [];
		}
		return $values;
	}

	/**
	 *
	 */
	public function sanitize_proxy( $values ) {
		try {
			$values = array_filter( (array) $values );
			$values = array_map( 'boolval', $values );
		} catch ( \Exception $err ) {
			$values = [];
		}
		return $values;
	}

	/**
	 *	@param string $key
	 *	@return string
	 */
	private function sanitize_key_case( $key ) {
		return preg_replace( '/[^A-Za-z0-9_\-]/', '', $key );
	}

	private function boolval_recursive( $val ) {
		if ( $val === '0' ) {
			return false;
		} else if ( is_array( $val ) ) {
			return array_map( [ $this, 'boolval_recursive' ], $val );
		}
		throw( new \Exception('invalid value') );
	}

	/**
	 *	Whether a map tile provider is insecure.
	 *
	 *	@param array $options Map provider options
	 *	@return boolean
	 */
	private function is_insecure( $options ) {
		return is_array($options) && isset( $options['url'] ) && strpos( $options['url'], 'http:' ) === 0;
	}

	/**
	 *	Whether a map tile provider has bounds
	 *
	 *	@param array $options Map provider options
	 *	@return boolean
	 */
	private function has_bounds( $options ) {
		return is_array($options) && isset( $options['options']['bounds'] );
	}

	/**
	 *	Whether a map tile is overlay.
	 *
	 *	@param array $options Map provider options
	 *	@return boolean
	 */
	private function is_overlay( $options ) {
		return is_array($options) && isset( $options['isOverlay'] ) && $options['isOverlay'];;
	}

	/**
	 *	@param string $key Provider key
	 */
	private function print_test_link( $key ) {
		?>
		<a href="#" data-layer="<?php esc_attr_e( $key ) ?>" class="action-test">
			<?php esc_html_e('Test', 'acf-openstreetmap-field' ); ?>
		</a>
		<?php
	}

	/**
	 *	Print some documentation for this optionset
	 */
	public function providers_description() {

		?>
		<div class="inside">
			<p class="description"><?php esc_html_e( 'Select which map tile providers should be selectable in the ACF Field.' , 'acf-openstreetmap-field' ); ?></p>
			<p class="description"><?php esc_html_e( 'Configure Access Tokens for various Map Tile providers.' , 'acf-openstreetmap-field' ); ?></p>
		</div>
		<?php
	}

}

<?php

namespace ACFFieldOpenstreetmap\Settings\Traits;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;

trait GeocoderSettings {

	/** @var array */
	private $geocoder_defaults = [
		// scale parameter for geocoder - detail
		'engine'   => Core\LeafletGeocoders::GEOCODER_DEFAULT,
		'scale'    => '18', // (int) 0-18 | 'auto'
		'opencage' => [
			'apiKey' => null,
		],
	];

	/** @var array */
	private $geocoder_scale_options;

	/**
	 *	Output geocoder settings
	 */
	private function print_geocoder_settings() {
		$geocoders = Core\LeafletGeocoders::instance();
		?>
		<h3><?php esc_html_e('Geocoder Options', 'acf-openstreetmap-field') ?></h3>
		<div class="acf-osm-geocoder-settings">
			<div>
				<table class="form-table" role="presentation">
					<?php
					do_settings_fields( $this->optionset, 'geocoder' );
					?>
				</table>
				<?php

				foreach ( $geocoders->get_geocoders() as $slug => $geocoder ) {
					if ( ! isset( $geocoder['settings'] ) ) {
						continue;
					}
					?>
					<div class="card">
						<h3>
							<?php esc_html_e( $geocoder['label'], 'geocoder', 'acf-openstreetmap-field' ); ?>
						</h3>
						<table class="form-table" role="presentation">
							<?php
							do_settings_fields( $this->optionset, "geocoder-{$slug}" );
							?>
						</table>
					</div>
					<?php
				}

				?>
			</div>
			<div class="acf-osm-test-map-container">
				<div class="acf-osm-test-map">
					<div
						class="leaflet-map"
						data-test="geocoders"
						data-map="leaflet"
						data-map-lat="53.55064"
						data-map-lng="10.00065"
						data-map-zoom="9"
						data-map-layers="<?php echo esc_attr( json_encode(['OpenStreetMap.Mapnik']) ); ?>"
						>
					</div>
				</div>
				<p class="description">
					<?php esc_html_e('Use search to geocode.','acf-openstreetmap-field'); ?><br />
					<?php esc_html_e('Click on the map for reverse geocode.','acf-openstreetmap-field'); ?>
				</p>
				<h3><?php esc_html_e('Geocoder response', 'acf-openstreetmap-field'); ?></h3>
				<pre class="acf-osm-geocode-response code card"></pre>
			</div>
		</div>
		<?php
	}

	/**
	 *	Setup Geocoder options
	 */
	private function register_settings_geocoder() {
		$settings_section = 'acf_osm_geocoder';
		$geocoder_option  = get_option( 'acf_osm_geocoder' );
		$geocoders        = Core\LeafletGeocoders::instance();

		register_setting( $this->optionset, 'acf_osm_geocoder', [ $this , 'sanitize_geocoder' ] );

		add_settings_section(
			$settings_section,
			__( 'Geocoder Settings', 'acf-openstreetmap-field' ),
			[ $this, 'tokens_description' ],
			$this->optionset
		);

		add_settings_field(
			"{$settings_section}-engine",
			__('Geocoder','acf-openstreetmap-field'),
			function() use ( $geocoder_option, $geocoders ) {
				echo $this->select_ui( array_map( function($geocoder) { // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					return $geocoder['label'];
				}, $geocoders->get_geocoders() ), $geocoder_option['engine'], 'acf_osm_geocoder[engine]' );
			},
			$this->optionset,
			'geocoder'
		);

		add_settings_field(
			"{$settings_section}-scale",
			__( 'Reverse Geocoder Detail Level', 'acf-openstreetmap-field' ),
			function() use ( $geocoder_option ) {
				echo $this->select_ui( $this->get_scale_options(), $geocoder_option['scale'], 'acf_osm_geocoder[scale]' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			},
			$this->optionset,
			'geocoder'
		);

		foreach ( $geocoders->get_geocoders() as $slug => $geocoder ) {
			if ( isset( $geocoder['settings'] ) ) {
				foreach ( $geocoder['settings'] as $prop => $setting ) {
					// TODO: generate service settings from $geocoders->get_geocoders()
					$label = __( $setting['label'], 'geocoder', 'acf-openstreetmap-field');
					if ( $setting['required'] ) {
						$label .= ' ' . __('(Required)', 'acf-openstreetmap-field');
					}
					add_settings_field(
						"{$settings_section}-{$slug}-{$prop}",
						$label,
						function() use ( $setting, $geocoder_option, $slug, $prop ) {
							$value = isset( $geocoder_option[$slug][$prop] )
								? $geocoder_option[$slug][$prop]
								: '';
							// TODO: choose UI by $setting['type']
							printf(
								'<input class="regular-text code" type="text" name="%1$s" value="%2$s" %3$s />',
								'acf_osm_geocoder[opencage][apiKey]',
								esc_attr( $value ),
								$setting['required'] ? 'required' : ''
							);
						},
						$this->optionset,
						"geocoder-{$slug}"
					);

				}
			}
		}
	}

	/**
	 *	@return array
	 */
	private function get_scale_options() {
		if ( ! isset( $this->geocoder_scale_options ) ) {
			/*
			|                 NOMINATIM                     |  ACF OpenStreetMap Field |
			|-----------------------------------------------|--------------------------|
			|  zoom | Detail level (DE) | Detail level (US) |    zoom | Detail level   |
			|-------|-------------------|-------------------|---------|----------------|
			|     0 | country           | country           |       0 | country        |
			|     1 | country           | country           |       1 | country        |
			|     2 | country           | country           |       2 | country        |
			|     3 | country           | country           |       3 | country        |
			|     4 | country           | country           |       4 | country        |
			|     5 | state             | state             |       5 | state          |
			|     6 | state             | state             |       6 | state          |
			|     7 | state             | state             |       8 | county         |
			|     8 | county            | city              |       8 | county         |
			|     9 | county            | city              |       9 | county         |
			|    10 | village           | city              |      10 | village/suburb |
			|    11 | village           | city              |      11 | village/suburb |
			|    12 | village           | city              |      12 | village/suburb |
			|    13 | village           | suburb            |      13 | village/suburb |
			|    14 | postcode          | neighbourhood     |      16 | village/suburb |
			|    15 | postcode          | neighbourhood     |      16 | village/suburb |
			|    16 | road (major)      | road (major)      |      18 | building       |
			|    17 | road (+minor)     | road (+minor)     |      18 | building       |
			|    18 | building          | building          |      18 | building       |
			*/
			$this->geocoder_scale_options = [
				'auto' => __('Derived from zoom', 'acf-openstreetmap-field'),
				'0' => __('0 (Country)', 'acf-openstreetmap-field'),
				'1' => __('1', 'acf-openstreetmap-field'),
				'2' => __('2', 'acf-openstreetmap-field'),
				'3' => __('3', 'acf-openstreetmap-field'),
				'4' => __('4', 'acf-openstreetmap-field'),
				'5' => __('5', 'acf-openstreetmap-field'),
				'6' => __('6', 'acf-openstreetmap-field'),
				'7' => __('7', 'acf-openstreetmap-field'),
				'8' => __('8', 'acf-openstreetmap-field'),
				'9' => __('9', 'acf-openstreetmap-field'),
				'10' => __('10', 'acf-openstreetmap-field'),
				'11' => __('11', 'acf-openstreetmap-field'),
				'12' => __('12', 'acf-openstreetmap-field'),
				'13' => __('13', 'acf-openstreetmap-field'),
				'14' => __('14', 'acf-openstreetmap-field'),
				'15' => __('15', 'acf-openstreetmap-field'),
				'16' => __('16', 'acf-openstreetmap-field'),
				'17' => __('17', 'acf-openstreetmap-field'),
				'18' => __('18 (Building)', 'acf-openstreetmap-field'),
			];
		}
		return $this->geocoder_scale_options;
	}

	/**
	 *	@param array $new_value
	 *	@return array $new_value
	 */
	public function sanitize_geocoder( $new_values ) {

		// make sure defaults are present
		$values  = array_replace_recursive( $this->geocoder_defaults, $new_values );

		// make sure geocoder exists
		if ( ! in_array( $new_values['engine'], Core\LeafletGeocoders::GEOCODERS ) ) {
			$values['engine'] = Core\LeafletGeocoders::GEOCODER_DEFAULT;
		}

		if ( ! array_key_exists( $values['scale'], $this->get_scale_options() )  ) {
			$values['scale'] = $this->geocoder_defaults['scale'];
		}

		$values['opencage']['apiKey'] = sanitize_text_field( $values['opencage']['apiKey'] );

		return $values;

	}
}

<?php

namespace ACFFieldOpenstreetmap\Field;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;

// exit if accessed directly
if( ! defined( 'ABSPATH' ) ) exit;


class OpenStreetMap extends \acf_field {

	private static $_instance = null;

	public static function get_instance() {
		if ( is_null( self::$_instance ) ) {
			new self();
		}
		return self::$_instance;
	}

	/*
	*  __construct
	*
	*  This function will setup the field type data
	*
	*  @type	function
	*  @date	5/03/2014
	*  @since	5.0.0
	*
	*  @param	n/a
	*  @return	n/a
	*/

	function __construct() {
		if ( ! is_null( self::$_instance ) ) {
			throw new Exception('Not more than one Field\OpenStreetMap!');
		}

		self::$_instance = $this;

		$core = Core\Core::instance();
		/*
		*  name (string) Single word, no spaces. Underscores allowed
		*/
		$this->name = 'open_street_map';
		/*
		*  label (string) Multiple words, can include spaces, visible when selecting a field type
		*/
		$this->label = __("OpenStreetMap",'acf-openstreetmap-field');

		/*
		 *  category (string) basic | content | choice | relational | jquery | layout | CUSTOM GROUP NAME
		 */
		$this->category = 'jquery';

		$this->default_values = array(
			// hamburg
			'lat'		=> 53.55064,
			'lng'		=> 10.00065,
			'zoom'		=> 12,
			'layers'	=> array( 'OpenStreetMap' ),
			'markers'	=> array(),
			// gm compatibility
			'address'	=> '',
		);
		/*
		 *  defaults (array) Array of default settings which are merged into the field object. These are used later in settings
		 */
		$this->defaults = array(
			'center_lat'		=> $this->default_values['lat'],
			'center_lng'		=> $this->default_values['lng'],
			'zoom'				=> $this->default_values['zoom'],

			'height'			=> 400,
			'return_format'		=> 'leaflet',
			'allow_map_layers'	=> 1,
			'max_markers'		=> '',
			'layers'			=> $this->default_values['layers'],
		);

		/*
		 *  l10n (array) Array of strings that are used in JavaScript. This allows JS strings to be translated in PHP and loaded via:
		 *  var message = acf._e('FIELD_NAME', 'error');
		 */
		$this->l10n = array();

		add_action( 'print_media_templates', array( $this, 'print_media_templates' ) );

		add_action( 'wp_footer', array( $this, 'maybe_print_media_templates' ), 11 );

		// do not delete!
    	parent::__construct();

	}


	/*
	*  render_field_settings()
	*
	*  Create extra settings for your field. These are visible when editing a field
	*
	*  @type	action
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	$field (array) the $field being edited
	*  @return	n/a
	*/

	function render_field_settings( $field ) {

		$core = Core\Core::instance();


		$field = $this->sanitize_field( $field );

		// return_format
		acf_render_field_setting( $field, array(
			'label'			=> __('Return Format','acf'),
			'instructions'	=> '',
			'type'			=> 'radio',
			'name'			=> 'return_format',
			'choices'		=> array(
				'raw'			=> __("Raw Data",'acf-openstreetmap-field'),
				'leaflet'		=> __("Leaflet JS",'acf-openstreetmap-field'),
				'osm'			=> __("iFrame (OpenStreetMap.org)",'acf-openstreetmap-field'),
			),
			'layout'	=>	'horizontal',
		));


		acf_render_field_setting( $field, array(
			'label'				=> __( 'Map Appearance', 'acf-openstreetmap-field' ),
			'instructions'		=> __( 'Set zoom, center and select layers being displayed.', 'acf-openstreetmap-field' ),
			'type'				=> 'leaflet_map',
			'name'				=> 'leaflet_map',

			'return_format'		=> 'leaflet',
			'attr'				=> array(
				'data-editor-config'	=> array(
					'allow_providers'		=> true,
					'restrict_providers'	=> array(), 
					'max_markers'			=> 0, // no markers
					'name_prefix'			=> $field['prefix'],
				),
				'data-map-layers'		=> $field['layers'],
			),
			'value'	=> array(
				'lat'				=> $field['center_lat'],
				'lng'				=> $field['center_lng'],
				'zoom'				=> $field['zoom'],
				'layers'			=> $field['layers'],
				'markers'			=> array(),
			),
//			'placeholder'		=> $this->default_values,
		) );

		// lat
		acf_render_field_setting( $field, array(
			'label'			=> __('Map Position','acf-openstreetmap-field'),
			'instructions'	=> __('Center the initial map','acf-openstreetmap-field'),
			'type'			=> 'number',
			'name'			=> 'center_lat',
			'prepend'		=> __('lat','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['lat']
		));


		// lng
		acf_render_field_setting( $field, array(
			'label'			=> __('Center','acf-openstreetmap-field'),
			'instructions'	=> __('Center the initial map','acf-openstreetmap-field'),
			'type'			=> 'number',
			'name'			=> 'center_lng',
			'prepend'		=> __('lng','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['lng'],
			'_append' 		=> 'center_lat'
		));


		// zoom
		acf_render_field_setting( $field, array(
			'label'			=> __('Zoom','acf-openstreetmap-field'),
			'instructions'	=> __('Set the initial zoom level','acf-openstreetmap-field'),
			'type'			=> 'number',
			'name'			=> 'zoom',
			'min'			=> 1,
			'max'			=> 22,
			'prepend'		=> __('zoom','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['zoom'],
			'_append' 		=> 'center_lat',
		));

		// allow_layer selection
		acf_render_field_setting( $field, array(
			'label'			=> __('Allow layer selection','acf-openstreetmap-field'),
			'instructions'	=> '',
			'name'			=> 'allow_map_layers',
			'type'			=> 'true_false',
			'ui'			=> 1,
		));

		// map height
		acf_render_field_setting( $field, array(
			'label'			=> __('Height','acf'),
			'instructions'	=> __('Customize the map height','acf-openstreetmap-field'),
			'type'			=> 'text',
			'name'			=> 'height',
			'append'		=> 'px',
		));


		// allow_layer selection
		acf_render_field_setting( $field, array(
			'label'			=> __( 'Max. number of Markers', 'acf-openstreetmap-field' ),
			'instructions'	=> __( 'Leave empty for infinite markers', 'acf-openstreetmap-field' ),
			'name'			=> 'max_markers',
			'type'			=> 'number',
			'ui'			=> 1,
			'min'			=> 0,
			'step'			=> 1,
		));

		// layers

	}

	/*
	 *  render_field()
	 *
	 *  Create the HTML interface for your field
	 *
	 *  @param	$field (array) the $field being rendered
	 *
	 *  @type	action
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$field (array) the $field being edited
	 *  @return	n/a
	 */
	function render_field( $field ) {

		$core = Core\Core::instance();
	
		if ( is_null( $field['value'] ) ) {
			$field['value'] = $this->sanitize_value( array(), $field, 'display' );
		}

		// value
		//$field['value'] = wp_parse_args( $field['value'], $this->default_values );

		// json_encoded value
		acf_hidden_input(array(
			'id'		=> $field['id'],
			'name'		=> $field['name'],
			'value'		=> json_encode( $field['value'] ),
			'class'		=> 'osm-json',
		));

		$providers = false;

		if ( isset($field['return_format']) ) {
			if ( $field['return_format'] === 'osm' ) {
				$providers = $core->get_osm_layers();
			} else {
				$providers = $core->get_leaflet_layers();
			}
		}

		$max_markers = $field['max_markers'] === '' ? false : intval( $field['max_markers'] );

		if ( 'osm' === $field['return_format'] ) {
			if ( $max_markers === false ) { // no restrictin > max one marker
				$max_markers = 1;
			}
			// oly one marker max
			$max_markers = min( $max_markers, 1 );
		}

		// the map
		acf_render_field( array(
			'type'				=> 'leaflet_map',
			'name'				=> $field['name'],
			'value'				=> $field['value'],
			'return_format'		=> 'leaflet',
			'attr'				=> array(
				'data-editor-config'	=> array(
//					'return-format'			=> $field['return_format'],
					'allow_providers'		=> $field['allow_map_layers'],
					'restrict_providers'	=> array_values( $providers ),
					'max_markers'			=> $max_markers,
					'name_prefix'			=> $field['name'],
				),
				'data-map-lat'	=> $field['value']['lat'],
				'data-map-lng'	=> $field['value']['lng'],
				'data-map-zoom'	=> $field['value']['zoom'],
			),
		) );

		?>
		<?php

		// markers
		$markers = array(); // $field['value']['markers'];


		if ( $max_markers !== 0 ) {
			?>
				<div class="markers-instruction">
					<p class="description"><?php _e('Double click to add Marker. Drag to move.', 'acf-openstreetmap-field' ); ?></p>
				</div>
			<?php
			
		}
		?>
		<div class="osm-markers">
		</div>
		<?php

	}

	/*
	 *  input_admin_enqueue_scripts()
	 *
	 *  This action is called in the admin_enqueue_scripts action on the edit screen where your field is created.
	 *  Use this action to add CSS + JavaScript to assist your render_field() action.
	 *
	 *  @type	action (admin_enqueue_scripts)
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	n/a
	 *  @return	n/a
	 */
	function input_admin_enqueue_scripts() {

		wp_enqueue_script('acf-input-osm');

		wp_enqueue_script('acf-osm-frontend');

		wp_enqueue_style('acf-input-osm');

		wp_enqueue_style('leaflet');

	}

	/*
	*  field_group_admin_enqueue_scripts()
	*
	*  This action is called in the admin_enqueue_scripts action on the edit screen where your field is edited.
	*  Use this action to add CSS + JavaScript to assist your render_field_options() action.
	*
	*  @type	action (admin_enqueue_scripts)
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	n/a
	*  @return	n/a
	*/
	function field_group_admin_enqueue_scripts() {

		wp_enqueue_script('acf-input-osm');

		wp_enqueue_script('acf-field-group-osm');

		wp_enqueue_script('acf-osm-frontend');

		wp_enqueue_style('acf-input-osm');

		wp_enqueue_style('leaflet');

	}


	/*
	*  load_value()
	*
	*  This filter is applied to the $value after it is loaded from the db
	*
	*  @type	filter
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	$value (mixed) the value found in the database
	*  @param	$post_id (mixed) the $post_id from which the value was loaded
	*  @param	$field (array) the field array holding all the field options
	*  @return	$value
	*/
	function load_value( $value, $post_id, $field ) {

		// prepare data for display
		$value = $this->sanitize_value( $value, $field, 'display' );

		return $value;
	}

	/**
	 *	Sanitize lat, lng, convert legacy properties
	 */
	private function sanitize_geodata( $value ) {

		// convert settings from <= 1.0.1 or acf gm field
		if ( isset( $value['center_lat'] ) ) {
			if ( ( ! isset( $value['lat'] ) || empty( $value['lat'] ) ) && ! empty( $value['center_lat'] ) ) {
				$value['lat'] = $value['center_lat'];
			}
			unset( $value['center_lat'] );			
		}
		
		if ( isset( $value['center_lng'] ) ) {
			if ( ( ! isset( $value['lng'] ) || empty( $value['lng'] ) ) && ! empty( $value['center_lng'] ) ) {
				$value['lng'] = $value['center_lng'];
			}
			unset( $value['center_lng'] );
		}

		// apply defaults
		$value = wp_parse_args( $value, array(
			'lat'	=> $this->default_values['lat'],
			'lng'	=> $this->default_values['lng'],
		) );
		
		// typecast values
		$value['lat'] = floatval( $value['lat'] );
		$value['lng'] = floatval( $value['lng'] );

		// maybe sanitize zoom
		if ( isset( $value['zoom'] )) {
			// boundaries
			$value['zoom'] = min( 22, max( 0, intval( $value['zoom'] ) ) );

		}

		return $value;
	}


	/**
	 *	@param array $value	array( 'lat' => float, 'lng => float, 'zoom' => int, 'address' => string, 'markers' => array, 'layers' => array )
 	 *	@param array $field
 	 *	@param string $context edit|dispaly|update
 	 *	@return array Sanitized $value
 	 */
	private function sanitize_value( $value, $field, $context = '' ) {

		$value = (array) $value;
		
		$value = $this->sanitize_geodata( $value );

		// $value = wp_parse_args( $value, $field );
		// 
		$value = wp_parse_args( $value, $this->default_values );

		//
		// Markers
		//
		if ( ! is_array( $value['markers'] ) ) {
			$value['markers'] = array();
		}

		// make sure its an indexed array
		$value['markers'] = array_values( $value['markers'] );

		// Maybe get marker from ACF GoogleMaps data
		if ( 'display' === $context ) { // display + edit
			
			if ( ! empty( $value[ 'address' ] ) ) {

				// create marker from GM field address
				if ( $field['max_markers'] !== 0 && ! count( $value[ 'markers' ] ) ) {

					$value['markers'][] = array(
						'label'	=> wp_kses_post( $value['address'] ),
						'default_label'	=> '',
						'lat'	=> $value['lat'],
						'lng'	=> $value['lng'],
					);

				}				
			} else  {
				if ( count( $value[ 'markers' ] ) ) {
					// set address from first marker
					$value['address'] = $value['markers'][0]['label'];
				}
			}
		}

		// typecast
		foreach ( $value['markers'] as &$marker ) {

			$marker = $this->sanitize_geodata( $marker );

			$marker['label'] = wp_kses_post( $marker[ 'label' ], array(), $allowed_protocols = '' );
			$marker['default_label'] = wp_kses_post( $marker[ 'default_label' ], array(), $allowed_protocols = '' );
		}
		// store data to be used by ACF GM Field
		if ( 'update' === $context ) {
			if ( count( $value['markers'] ) ) {
				// update address from first marker
				$value['address'] = $value['markers'][0]['label'];
			} else {
				$value['address'] = '';
			}
		}

		// Sanitize HTML from address
		$value[ 'address' ] = wp_kses_post( $value[ 'address' ] );

		//
		// Layers
		//
		if ( ! is_array( $value['layers'] ) ) {
			$value['layers'] = array();
		}

		// set default layers if layer selection is empty or prohibited
		if ( ! count( $value['layers'] ) || ! $field['allow_map_layers'] ) {
			$value['layers'] = $field['layers'];
		} else {
			// normalize layers
			$value['layers'] = array_filter( $value['layers'] );
			$value['layers'] = array_unique( $value['layers'] );
			$value['layers'] = array_values( $value['layers'] );
		}

		return array_intersect_key( $value, $this->default_values );

	}


	/*
	 *  update_value()
	 *
	 *  This filter is applied to the $value before it is saved in the db
	 *
	 *  @type	filter
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$value (mixed) the value found in the database
	 *  @param	$post_id (mixed) the $post_id from which the value was loaded
	 *  @param	$field (array) the field array holding all the field options
	 *  @return	$value
	 */
	function update_value( $value, $post_id, $field ) {

		// sanitize data from UI!

		// normalize markers
		

		if ( is_string( $value ) ) {
			$value = json_decode( stripslashes($value), true );
		}

		if ( ! is_array( $value ) ) {
			$value = $this->defaults;
		}

		$value = $this->sanitize_value( $value, $field, 'update' );



		return $value;
	}


	/*
	 *  format_value()
	 *
	 *  This filter is appied to the $value after it is loaded from the db and before it is returned to the template
	 *
	 *  @type	filter
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$value (mixed) the value which was loaded from the database
	 *  @param	$post_id (mixed) the $post_id from which the value was loaded
	 *  @param	$field (array) the field array holding all the field options
	 *
	 *  @return	$value (mixed) the modified value
	 */
	function format_value( $value, $post_id, $field ) {

		// bail early if no value
		if ( empty( $value ) ) {
			return $value;
		}

		// apply setting
		if ( $field['return_format'] === 'osm' ) {
			// features: one marker. 4 maps to choose from
			$core = Core\Core::instance();
			$bbox = Helper\MapHelper::getBbox( $value['lat'], $value['lng'], $value['zoom'] );
			$iframe_src_args = array(
				'bbox'	=> implode( ',', $bbox ),
			);

			$map_link_args = array();

			if ( $i_layer = $core->map_osm_layer( $value['layers'], 'iframe' ) ) {
				$iframe_src_args['layer'] = $i_layer;
			}

			foreach ( $value['markers'] as $marker ) {
				$iframe_src_args['marker'] = implode(',', array( $marker['lat'], $marker['lng'] ) );
				$map_link_args['mlat'] = $marker['lat'];
				$map_link_args['mlon'] = $marker['lng'];
			}
			$iframe_src = add_query_arg( $iframe_src_args, 'https://www.openstreetmap.org/export/embed.html' );

			$iframe_atts = array(
				'height'		=> $field['height'],
				'width'			=> '425',
				'frmaeborder'	=> 0,
				'scrolling'		=> 'no',
				'marginheight'	=> 0,
				'marginwidth'	=> 0,
				'src'			=> $iframe_src,
			);

			$map_link = add_query_arg( $map_link_args, 'https://www.openstreetmap.org/' );
			$map_link .= '#map=' . implode( '/', array( $value['zoom'], $value['lat'], $value['lng'] ) );

			if ( $l_layer = $core->map_osm_layer( $value['layers'], 'link' ) ) {
				$map_link .= '&amp;layers='.$l_layer;
			}

			$html = '<iframe %1$s></iframe><br/><small><a target="_blank" href="%2$s">%3$s</a></small>';

			/**
			 *	Filter iframe HTML.
			 *
			 *	@param string $html Template String. Placeholders: $1$s: iFrame Source, $2%s: URL of bigger map, %3$s: Link-Text.
			 */
			$html = apply_filters( 'osm_map_iframe_template', $html );

			$value = sprintf( $html, acf_esc_attr( $iframe_atts ), $map_link, __( 'View Larger Map','acf-openstreetmap-field' ) );

		} else if ( $field['return_format'] === 'leaflet' ) {
			// features: multiple markers. lots of maps to choose from
			$map_attr = array(
				'class'				=> 'leaflet-map',
				'data-height'		=> $field['height'],
				'data-map'			=> 'leaflet',
				'data-map-lng'		=> $value['lng'],
				'data-map-lat'		=> $value['lat'],
				'data-map-zoom'		=> $value['zoom'],
				'data-map-layers'	=> $value['layers'],
				'data-map-markers'	=> $value['markers'],
			);

			if ( isset( $field['attr'] ) ) {
				$map_attr = $field['attr'] + $map_attr;
			}

			// if ( ! empty( $value['address'] ) ) {
			//
			// 	$map_attr['data-marker-lng']	= $value['marker_lng'];
			// 	$map_attr['data-marker-lat']	= $value['marker_lat'];
			// 	$map_attr['data-marker-label']	= $value['address'];
			//
			// }

			$html = sprintf('<div %s></div>', acf_esc_attr( $map_attr ) );
			$value = $html;
			wp_enqueue_script( 'acf-osm-frontend' );
			wp_enqueue_style('leaflet');
		} else {
			$value = $this->sanitize_value( $value, $field, 'display' );
			// ensure backwards compatibility <= 1.0.1
			$value['center_lat'] = $value['lat']; 
			$value['center_lng'] = $value['lng']; 
		}


		// return
		return $value;
	}


	//*/


	/*
	*  validate_value()
	*
	*  This filter is used to perform validation on the value prior to saving.
	*  All values are validated regardless of the field's required setting. This allows you to validate and return
	*  messages to the user if the value is not correct
	*
	*  @type	filter
	*  @date	11/02/2014
	*  @since	5.0.0
	*
	*  @param	$valid (boolean) validation status based on the value and the field's required setting
	*  @param	$value (mixed) the $_POST value
	*  @param	$field (array) the field array holding all the field options
	*  @param	$input (string) the corresponding input name for $_POST value
	*  @return	$valid
	*/

	function validate_value( $valid, $value, $field, $input ){

		// bail early if not required
		if( ! $field['required'] ) {

			return $valid;

		}

		if ( empty($value) || empty($value['lat']) || empty($value['lng'] ) ) {

			return false;

		}


		// return
		return $valid;

	}



	/*
	*  load_field()
	*
	*  This filter is applied to the $field after it is loaded from the database
	*
	*  @type	filter
	*  @date	23/01/2013
	*  @since	3.6.0
	*
	*  @param	$field (array) the field array holding all the field options
	*  @return	$field
	*/
	function load_field( $field ) {

		return $this->sanitize_field( $field, 'display' );

	}


	/*
	*  update_field()
	*
	*  This filter is applied to the $field before it is saved to the database
	*
	*  @type	filter
	*  @date	23/01/2013
	*  @since	3.6.0
	*
	*  @param	$field (array) the field array holding all the field options
	*  @return	$field
	*/
	function update_field( $field ) {

		return $this->sanitize_field( $field, 'update' );

	}


	/**
	 *	@param array $field
	 *	@param string $context
	 *	@return array Sanitized $field
	 */
	private function sanitize_field( $field, $context = '' ) {

		$field = wp_parse_args( $field, array(
			'center_lat'	=> $this->defaults['center_lat'],
			'center_lng'	=> $this->defaults['center_lng'],
			'zoom'			=> $this->defaults['zoom'],
		) );
		
		// typecast values
		$field['center_lat']	= floatval( $field['center_lat'] );
		$field['center_lng']	= floatval( $field['center_lng'] );
		$field['zoom'] 			= min( 22, max( 1, intval( $field['zoom'] ) ) );

		return $field;
	}

	/**
	 *	@action wp_footer
	 */
	public function maybe_print_media_templates() {
		if ( ! did_action( 'print_media_templates' ) ) {
			$this->print_media_templates();
		}
	}
	

	/**
	 *	@action print_media_templates
	 */
	public function print_media_templates() {
		?>
		<script type="text/html" id="tmpl-osm-marker-input">
			<div class="locate">
				<a class="dashicons dashicons-location" data-name="locate-marker"><span class="screen-reader-text"><?php _e('Locate Marker','acf-openstreetmap-field'); ?></span></a>
			</div>
			<div class="input">
				<input type="text" data-name="label" />
			</div>
			<div class="tools">
				<a class="acf-icon -minus small light acf-js-tooltip" href="#" data-name="remove-marker" title="<?php _e('Remove Marker', 'acf-openstreetmap-field'); ?>"></a>
			</div>
		</script>
		<?php
	}

}

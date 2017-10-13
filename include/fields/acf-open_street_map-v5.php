<?php

// exit if accessed directly
if( ! defined( 'ABSPATH' ) ) exit;


// check if class already exists
if( !class_exists('acf_field_FIELD_NAME') ) :


class acf_field_open_street_map extends acf_field {


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

	function __construct( $settings ) {


		/*
		*  name (string) Single word, no spaces. Underscores allowed
		*/
		$this->name = 'open_street_map';
		/*
		*  label (string) Multiple words, can include spaces, visible when selecting a field type
		*/
		$this->label = __("OpenStreetMap",'acf-open-street-map');

		/*
		*  category (string) basic | content | choice | relational | jquery | layout | CUSTOM GROUP NAME
		*/
		$this->category = 'jquery';

		/*
		*  defaults (array) Array of default settings which are merged into the field object. These are used later in settings
		*/
		$this->defaults = array(
			'center_lat'	=> '',
			'center_lng'	=> '',
			'zoom'			=> '',
			'address'		=> '',
			'map_layers'	=> [],
		);

		/*
		*  l10n (array) Array of strings that are used in JavaScript. This allows JS strings to be translated in PHP and loaded via:
		*  var message = acf._e('FIELD_NAME', 'error');
		*/

		$this->l10n = array(
			'foo'	=> 'Bar!',
		);


		$this->default_values = array(
			'center_lat'		=> '-37.81411',
			'center_lng'		=> '144.96328',
			'zoom'				=> '14',
			'address'			=> '',
			'osm_layer'			=> 'mapnik',
			'leaflet_layers'	=> ['OpenStreetMap'],
		);
		$this->l10n = array(
			'locating'			=> __("Locating",'acf'),
			'browser_support'	=> __("Sorry, this browser does not support geolocation",'acf'),
		);


		/*
		*  settings (array) Store plugin settings (url, path, version) as a reference for later use with assets
		*/

		$this->settings = $settings;


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

		/*
		*  acf_render_field_setting
		*
		*  This function will create a setting for your field. Simply pass the $field parameter and an array of field settings.
		*  The array of settings does not require a `value` or `prefix`; These settings are found from the $field array.
		*
		*  More than one setting can be added by copy/paste the above code.
		*  Please note that you must also have a matching $defaults value for the field name (font_size)
		*/

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


		// center_lat
		acf_render_field_setting( $field, array(
			'label'			=> __('Center','acf'),
			'instructions'	=> __('Center the initial map','acf'),
			'type'			=> 'text',
			'name'			=> 'center_lat',
			'prepend'		=> 'lat',
			'placeholder'	=> $this->default_values['center_lat']
		));


		// center_lng
		acf_render_field_setting( $field, array(
			'label'			=> __('Center','acf'),
			'instructions'	=> __('Center the initial map','acf'),
			'type'			=> 'text',
			'name'			=> 'center_lng',
			'prepend'		=> 'lng',
			'placeholder'	=> $this->default_values['center_lng'],
			'_append' 		=> 'center_lat'
		));


		// zoom
		acf_render_field_setting( $field, array(
			'label'			=> __('Zoom','acf'),
			'instructions'	=> __('Set the initial zoom level','acf'),
			'type'			=> 'text',
			'name'			=> 'zoom',
			'placeholder'	=> $this->default_values['zoom']
		));


		// allow_null
		acf_render_field_setting( $field, array(
			'label'			=> __('Height','acf'),
			'instructions'	=> __('Customise the map height','acf'),
			'type'			=> 'text',
			'name'			=> 'height',
			'append'		=> 'px',
		));


		// allow_null
		acf_render_field_setting( $field, array(
			'label'			=> __('Allow layer selection','acf'),
			'instructions'	=> '',
			'name'			=> 'allow_map_layers',
			'type'			=> 'true_false',
			'ui'			=> 1,
		));

		// layers
		//*
		acf_render_field_setting( $field, array(
			'label'			=> __('Default Map Layers','acf'),
			'instructions'	=> '',
			'type'			=> 'select',
			'name'			=> 'default_leaflet_layers',
			'choices'		=> acf_plugin_open_street_map::instance()->get_layer_providers( ),
			'multiple'		=> 1,
			'ui'			=> 1,
			'allow_null'	=> 0,
			'placeholder'	=> __("Map Layers",'acf'),
		));

		acf_render_field_setting( $field, array(
			'label'			=> __('Default OSM Map Layer','acf'),
			'instructions'	=> '',
			'type'			=> 'select',
			'name'			=> 'default_osm_layer',
			'choices'		=> acf_plugin_open_street_map::instance()->get_osm_layers( ),
			'multiple'		=> 0,
			'ui'			=> 0,
			'allow_null'	=> 0,
			'placeholder'	=> __("Map Layers",'acf'),
		));

		/*/
		acf_render_field_setting( $field, array(
			'label'			=> __('Tile Server','acf'),
			'type'			=> 'select',
			// 'name'				=> $field['name'] . '[map_layers][]',
			// 'id'				=> $field['name'] . 'map_layers',
			'choices'			=> acf_plugin_open_street_map::instance()->get_providers( ),
			'value'				=> $field['value']['map_layers'],
			'multiple'			=> 1,
			'size'				=> 15,
			'data-prop'			=> 'map_layers',
			'data-multiple'		=> true,
			'data-ui'			=> true,
			'data-ajax'			=> false,
			'data-allow_null'	=> false,
			'data-placeholder'	=> __('Select'),

		) );
		//*/

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

		// validate value
		if( empty($field['value']) ) {
			$field['value'] = array();
		}


		// value
		$field['value'] = wp_parse_args( $field['value'], $this->default_values );

		acf_hidden_input(array(
			'name'		=> $field['name'] . '[center_lat]',
			'value'		=> $field['value']['center_lat'],
			'data-prop'	=> 'center_lat',
		));

		acf_hidden_input(array(
			'name'		=> $field['name'] . '[center_lng]',
			'value'		=> $field['value']['center_lng'],
			'data-prop'	=> 'center_lng',
		));

		acf_hidden_input(array(
			'name'		=> $field['name'] . '[zoom]',
			'value'		=> $field['value']['zoom'],
			'data-prop'	=> 'zoom',
		));



		if ( $field['allow_map_layers'] ) {
			?>
				<?php if ( 'leaflet' === $field['return_format'] ) { ?>
					<div class="acf-leaflet-layers">
						<?php
						acf_hidden_input(array(
							'name'		=> $field['name'] . '[map_layers]',
							'value'		=> '',
						));
						acf_select_input( array(
							'name'				=> $field['name'] . '[leaflet_layers][]',
							'id'				=> $field['name'] . 'leaflet_layers',
							'choices'			=> acf_plugin_open_street_map::instance()->get_layer_providers( ),
							'value'				=> $field['value']['leaflet_layers'],
							'multiple'			=> 'multiple',
							'size'				=> 5,
							'data-prop'			=> 'leaflet_layers',
							'data-multiple'		=> true,
							'data-ui'			=> true,
							'data-ajax'			=> false,
							'data-allow_null'	=> true,
							'data-placeholder'	=> __('Select','acf-open-street-map'),

						) );
						?>
					</div>
				<?php } elseif ( 'osm' === $field['return_format'] ) { ?>
					<div class="acf-osm-layers">
						<?php
						acf_select_input( array(
							'name'				=> $field['name'] . '[osm_layer]',
							'id'				=> $field['name'] . 'osm_layer',
							'choices'			=> acf_plugin_open_street_map::instance()->get_osm_layers( ),
							'value'				=> $field['value']['osm_layer'],
							'size'				=> 5,
							'data-prop'			=> 'osm_layer',
							'data-multiple'		=> false,
							'data-ui'			=> false,
							'data-ajax'			=> false,
							'data-allow_null'	=> false,
							'data-placeholder'	=> __('Select','acf-open-street-map'),

						) );
						?>
					</div>
			<?php } ?>
			<?php

		} else {

			foreach ( $field['default_leaflet_layers'] as $layer ) {
				acf_hidden_input( array(
					'name'		=> $field['name'] . '[leaflet_layers][]',
//					'choices'	=> acf_plugin_open_street_map::instance()->get_providers( ),
					'value'		=> $layer,
					'data-prop'	=> 'leaflet_layers',
				));

			}
			acf_hidden_input( array(
				'name'		=> $field['name'] . '[osm_layer]',
//					'choices'	=> acf_plugin_open_street_map::instance()->get_providers( ),
				'value'		=> $layer,
				'data-prop'	=> 'osm_layer',
			));
		}

	?>
		<div class="acf-osf-geocode">
		<?php

		acf_text_input( array(
			'name'		=> $field['name'] . '[address]',
			'type'		=> 'text',
			'value'		=> $field['value']['address'],
			'data-prop'	=> 'address',
		));
		?>
		<div class="osm-results"></div>
	</div>
	<?php
?>
	<div class="acf-osm-map"></div>
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

	/*
	*/

	function input_admin_enqueue_scripts() {

		// vars
		$url = $this->settings['url'];
		$version = $this->settings['version'];


		// register & include JS
		wp_register_script( 'leaflet', "{$url}assets/js/leaflet.js", array() );
		wp_register_script( 'acf-input-open-street-map', "{$url}assets/js/acf-input-osm.js", array('leaflet','acf-input','backbone'), $version );
		wp_localize_script('acf-input-open-street-map','acf_osm',array(
			'options'	=> array(
				'layer_config'	=> get_option( 'acf_osm_provider_tokens', array() ),
			),
		));
		wp_enqueue_script('acf-input-open-street-map');


		// register & include CSS
		wp_register_style( 'leaflet', 'https://unpkg.com/leaflet@1.2.0/dist/leaflet.css', array(), $version );
		wp_register_style( 'acf-input-open-street-map', "{$url}assets/css/acf-input-osm.css", array('leaflet','acf-input'), $version );
		wp_enqueue_style('acf-input-open-street-map');

	}

	function field_group_admin_enqueue_scripts() {

		$url = $this->settings['url'];
		$version = $this->settings['version'];

		wp_register_script( 'acf-field-group-open-street-map', "{$url}assets/js/acf-field-group-osm.js", array('acf-field-group'), $version );

		wp_localize_script('acf-field-group-open-street-map','acf_osm_field_group',array(
			'options'	=> array(
				'layer_config'	=> get_option( 'acf_osm_provider_tokens', array() ),
			),
		));
		wp_enqueue_script('acf-field-group-open-street-map');

		wp_register_style( 'acf-field-group-open-street-map', "{$url}assets/css/acf-field-group-osm.css", array( 'acf-input' ), $version );
		wp_enqueue_style('acf-field-group-open-street-map');

	}


	/*
	*  input_admin_head()
	*
	*  This action is called in the admin_head action on the edit screen where your field is created.
	*  Use this action to add CSS and JavaScript to assist your render_field() action.
	*
	*  @type	action (admin_head)
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	n/a
	*  @return	n/a
	*/

	/*

	function input_admin_head() {



	}

	*/


	/*
   	*  input_form_data()
   	*
   	*  This function is called once on the 'input' page between the head and footer
   	*  There are 2 situations where ACF did not load during the 'acf/input_admin_enqueue_scripts' and
   	*  'acf/input_admin_head' actions because ACF did not know it was going to be used. These situations are
   	*  seen on comments / user edit forms on the front end. This function will always be called, and includes
   	*  $args that related to the current screen such as $args['post_id']
   	*
   	*  @type	function
   	*  @date	6/03/2014
   	*  @since	5.0.0
   	*
   	*  @param	$args (array)
   	*  @return	n/a
   	*/

   	/*

   	function input_form_data( $args ) {



   	}

   	*/


	/*
	*  input_admin_footer()
	*
	*  This action is called in the admin_footer action on the edit screen where your field is created.
	*  Use this action to add CSS and JavaScript to assist your render_field() action.
	*
	*  @type	action (admin_footer)
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	n/a
	*  @return	n/a
	*/

	/*

	function input_admin_footer() {



	}

	*/

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

	/*

	function field_group_admin_enqueue_scripts() {

	}

	*/


	/*
	*  field_group_admin_head()
	*
	*  This action is called in the admin_head action on the edit screen where your field is edited.
	*  Use this action to add CSS and JavaScript to assist your render_field_options() action.
	*
	*  @type	action (admin_head)
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	n/a
	*  @return	n/a
	*/

	/*

	function field_group_admin_head() {

	}

	*/


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

	/*

	function load_value( $value, $post_id, $field ) {

		return $value;

	}

	*/


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

	/*

	function update_value( $value, $post_id, $field ) {

		return $value;

	}

	*/


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

	/*

	function format_value( $value, $post_id, $field ) {

		// bail early if no value
		if( empty($value) ) {

			return $value;

		}


		// apply setting
		if( $field['font_size'] > 12 ) {

			// format the value
			// $value = 'something';

		}


		// return
		return $value;
	}

	*/


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


		if( empty($value) || empty($value['lat']) || empty($value['lng']) ) {

			return false;

		}


		// return
		return $valid;

	}


	/*
	*  delete_value()
	*
	*  This action is fired after a value has been deleted from the db.
	*  Please note that saving a blank value is treated as an update, not a delete
	*
	*  @type	action
	*  @date	6/03/2014
	*  @since	5.0.0
	*
	*  @param	$post_id (mixed) the $post_id from which the value was deleted
	*  @param	$key (string) the $meta_key which the value was deleted
	*  @return	n/a
	*/

	/*

	function delete_value( $post_id, $key ) {



	}

	*/


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
		return $field;

		$defaults = wp_parse_args( array(
			'leaflet_layers'	=> $field['default_leaflet_layers'],
			'osm_layer'			=> $field['default_osm_layer'],
		), $this->default_values );

		$field['value'] = wp_parse_args( $field['value'], $defaults );

		return $field;

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

	/*

	function update_field( $field ) {

		$field['value'] = wp_parse_args( $field['value'], $this->default_values );

		return $field;

	}
	*/



	/*
	*  delete_field()
	*
	*  This action is fired after a field is deleted from the database
	*
	*  @type	action
	*  @date	11/02/2014
	*  @since	5.0.0
	*
	*  @param	$field (array) the field array holding all the field options
	*  @return	n/a
	*/

	/*

	function delete_field( $field ) {



	}

	*/


}


// initialize
new acf_field_open_street_map( $this->settings );


// class_exists check
endif;

?>

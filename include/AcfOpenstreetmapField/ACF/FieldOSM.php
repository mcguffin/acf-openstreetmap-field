<?php

namespace AcfOpenstreetmapField\ACF;

use AcfOpenstreetmapField\Core;

if ( ! class_exists( 'AcfOpenstreetmapField\ACF\FieldOSM' ) ) {

	class FieldOSM extends \acf_field {
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

		function initialize() {

			// vars
			$this->name = 'open_street_map';
			$this->label = __("OpenStreetMap",'acf');
			$this->category = 'jquery';
			$this->defaults = array(
				'height'		=> '',
				'center_lat'	=> '',
				'center_lng'	=> '',
				'zoom'			=> '',
				/*
				'tile_layer'	=> '',
				'return_format'	=> 'html', // html | raw
				*/
			);
			$this->default_values = array(
				'height'		=> '400',
				'center_lat'	=> '-37.81411',
				'center_lng'	=> '144.96328',
				'zoom'			=> '14',
				'tile_layer'	=> 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
				'return_format'	=> 'html',
			);
			$this->l10n = array(
				'locating'			=> __("Locating",'acf'),
				'browser_support'	=> __("Sorry, this browser does not support geolocation",'acf'),
			);
			$this->tile_layers = array(

				'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'		=> __('OpenStreetMap A'),
				'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'		=> __('OpenStreetMap B'),
				'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'		=> __('OpenStreetMap C'),

				'http://a.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png'	=> __('Open Cycle map A'),
				'http://b.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png'	=> __('Open Cycle map A'),

				'http://a.tile.openstreetmap.fr/hot/{x}/{x}/{y}.png'	=> __('Humanitatrian'),
				'http://b.tile.openstreetmap.fr/hot/{x}/{x}/{y}.png'	=> __('Humanitatrian'),

				'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png'	=> __('Wikimedia'),
			);
		}


		/*
		*  render_field()
		*
		*  Create the HTML interface for your field
		*
		*  @param	$field - an array holding all the field's data
		*
		*  @type	action
		*  @since	3.6
		*  @date	23/01/13
		*/

		function render_field( $field ) {

			// validate value
			if( empty($field['value']) ) {
				$field['value'] = array();
			}


			// value
			$field['value'] = wp_parse_args($field['value'], array(
				'address'	=> '',
				'lat'		=> '',
				'lng'		=> ''
			));


			// default options
			foreach( $this->default_values as $k => $v ) {

				if( empty($field[ $k ]) ) {
					$field[ $k ] = $v;
				}

			}


			// vars
			$atts = array(
				'id'			=> $field['id'],
				'class'			=> "acf-google-map {$field['class']}",
				'data-lat'		=> $field['center_lat'],
				'data-lng'		=> $field['center_lng'],
				'data-zoom'		=> $field['zoom'],
			);


			// has value
			if( $field['value']['address'] ) {
				$atts['class'] .= ' -value';
			}

			// osm goes here
	?>
		<div id="osm" style="height:200px;"></div>
	<?php

		}


		/*
		*  render_field_settings()
		*
		*  Create extra options for your field. This is rendered when editing a field.
		*  The value of $field['name'] can be used (like bellow) to save extra data to the $field
		*
		*  @type	action
		*  @since	3.6
		*  @date	23/01/13
		*
		*  @param	$field	- an array holding all the field's data
		*/

		function render_field_settings( $field ) {
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
				'placeholder'	=> $this->default_values['height']
			));

			// return_format
			acf_render_field_setting( $field, array(
				'label'			=> __('Return Format','acf'),
				'instructions'	=> '',
				'type'			=> 'radio',
				'name'			=> 'return_format',
				'choices'		=> array(
					'html'			=> __("Markup",'acf-openstreetmap-field'),
					'raw'			=> __("Data",'acf-openstreetmap-field'),
				),
				'layout'	=>	'horizontal',
			));

		}


		/*
		*  validate_value
		*
		*  description
		*
		*  @type	function
		*  @date	11/02/2014
		*  @since	5.0.0
		*
		*  @param	$post_id (int)
		*  @return	$post_id (int)
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
		*  update_value()
		*
		*  This filter is appied to the $value before it is updated in the db
		*
		*  @type	filter
		*  @since	3.6
		*  @date	23/01/13
		*
		*  @param	$value - the value which will be saved in the database
		*  @param	$post_id - the $post_id of which the value will be saved
		*  @param	$field - the field array holding all the field options
		*
		*  @return	$value - the modified value
		*/

		function update_value( $value, $post_id, $field ) {

			if( empty($value) || empty($value['lat']) || empty($value['lng']) ) {

				return false;

			}


			// return
			return $value;
		}


		/*
		*  input_admin_footer
		*
		*  description
		*
		*  @type	function
		*  @date	6/03/2014
		*  @since	5.0.0
		*
		*  @param	$post_id (int)
		*  @return	$post_id (int)
		*/

		function input_admin_footer() {
	?>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.2.0/dist/leaflet.css"
  integrity="sha512-M2wvCLH6DSRazYeZRIm1JnYyh22purTM+FDB5CsyxtQJYeKq83arPe5wgbNmcFXGqiSH2XR8dT/fJISVA1r/zQ=="
  crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.2.0/dist/leaflet.js"
  integrity="sha512-lInM/apFSqyy1o6s89K4iQUKg6ppXEgsVxT35HbzUupEVRh2Eu9Wdl4tHj7dZO0s1uvplcYGmt3498TtHq+log=="
  crossorigin=""></script>

<script>
	var mymap = L.map('osm').setView([51.505, -0.09], 13);
	L.tileLayer( 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
		maxZoom: 18
	}).addTo(mymap);
</script>
<?php


		}
	}
}

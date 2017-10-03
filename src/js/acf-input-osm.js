(function($){
	var options = acf_osm.options;
	console.log('sefsef')

	function initialize_field( $el ) {
		var $map	= $el.find('.acf-osm-map'),
			$zoom	= $el.find('[data-prop="zoom"]'),
			$lat	= $el.find('[data-prop="center_lat"]'),
			$lng	= $el.find('[data-prop="center_lng"]'),
			$tiles	= $el.find('[data-prop="map_layers"]'),
			the_map	= L.map( $map.get(0), {
				scrollWheelZoom: false,
				center: [ $lat.val(), $lng.val() ],
				zoom: $zoom.val()
			} ),
			layers	= [];

		function do_layers() {
			var val = [],
				provider, layer_config, i, len;

			if ( null === val ) {
				return;
			}
			$tiles.each(function(){
				var v = $(this).val();
				if ( Array.isArray(val) ) {
					val = val.concat(v)
				} else {
					val.push(v)
				}

			});

			// remove layers
			while (layers.length) {
				the_map.removeLayer( layers.pop() );
			}

//			val = val.reverse();
			len = val.length;

			for ( i=0;i<len;i++ ) {
				provider = val[i];
				layer_config = options.layer_config[ provider.split('.')[0] ] || {};
				layers.push( L.tileLayer.provider( provider, layer_config ).addTo(the_map) );
			}
		}


		if ( $tiles.is('select') ) {
			acf.select2.init( $tiles, {
				multiple: true,
				ui: true,
				allow_null: false,
				ajax:false,
			}, $el );
		} else {

		}
		do_layers();


			// layer	= L.tileLayer( $tiles.val(), {
			// 	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
			// 	maxZoom: 18
			// }).addTo(the_map);

		$tiles.on('change', do_layers )
			.prev('input').on('change', do_layers );

		the_map.on('zoomend',function() {
			$zoom.val(the_map.getZoom());
		});

		the_map.on('moveend',function(){
			var center = the_map.getCenter();
			$lat.val(center.lat);
			$lng.val(center.lng);
		});

	}


	if( typeof acf.add_action !== 'undefined' ) {

		/*
		*  ready append (ACF5)
		*
		*  These are 2 events which are fired during the page load
		*  ready = on page load similar to $(document).ready()
		*  append = on new DOM elements appended via repeater field
		*
		*  @type	event
		*  @date	20/07/13
		*
		*  @param	$el (jQuery selection) the jQuery element which contains the ACF fields
		*  @return	n/a
		*/

		acf.add_action('ready append', function( $el ){

			// search $el for fields of type 'FIELD_NAME'
			acf.get_fields({ type : 'open_street_map'}, $el).each(function(){

				initialize_field( $(this) );

			});

		});


	} else {


		/*
		*  acf/setup_fields (ACF4)
		*
		*  This event is triggered when ACF adds any new elements to the DOM.
		*
		*  @type	function
		*  @since	1.0.0
		*  @date	01/01/12
		*
		*  @param	event		e: an event object. This can be ignored
		*  @param	Element		postbox: An element which contains the new HTML
		*
		*  @return	n/a
		*/

		$(document).on('acf/setup_fields', function(e, postbox){

			$(postbox).find('.field[data-field_type="open_street_map"]').each(function(){

				initialize_field( $(this) );

			});

		});


	}


})(jQuery);

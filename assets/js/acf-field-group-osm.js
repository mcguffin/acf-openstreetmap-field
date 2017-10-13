(function($){
	var options = acf_osm_field_group.options;

	function render_field_settings( $el ) {
		$el.attr( 'data-return-format', $el.find('.acf-field-setting-return_format [type="radio"]:checked').val() )
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

		acf.add_action( 'render_field_settings', render_field_settings );

		$(document).on('change','.acf-field-object-open-street-map .acf-field-setting-return_format [type="radio"]', function() {
			var $el = $(this).closest('.acf-field-object');
			render_field_settings( $el )
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

				new osm.field( { el: this } );

			});

		});


	}


})(jQuery);

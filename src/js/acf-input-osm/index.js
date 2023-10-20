import $ from 'jquery';
import { MarkerData, MarkerCollection } from 'media/models';
import { MapInput } from 'media/views';

$(document)
	.on( 'acf-osm-map-create', function( e ) {

		// don't init in repeater templates
		if ( $(e.target).closest('[data-id="acfcloneindex"]').length ) {
			e.preventDefault();
			return;
		}
	})
	.on( 'acf-osm-map-init', function( e ) {
		const map = e.detail.map;

		// wrap MapInput backbone view around editors
		if ( $(e.target).is('[data-editor-config]') ) {
			// e.preventDefault();

			(() => {
				if ( ! $(e.target).is(':visible') ) {
					return setTimeout( checkVis, 250 );
				}
				map.invalidateSize();
			})();
			const field  = acf.getField( $(e.target).closest('.acf-field') )
			const editor = new MapInput( { el: e.target, map: map, field: field } );
			field.set( 'osmEditor', editor )
			$(e.target).data( '_map_editor', editor );
		}
	});

// init when fields get loaded ...
acf.addAction( 'append', function( $el ){
	//*
	// @see https://github.com/mcguffin/acf-openstreetmap-field/issues/100
	// @see https://github.com/mcguffin/acf-openstreetmap-field/pull/101
	if ( $el.constructor === $ && $el.length ) {
		$el.get(0).dispatchEvent( new CustomEvent('acf-osm-map-added') );
	}
	/*/
	$el.length && $el.get(0).dispatchEvent( new CustomEvent('acf-osm-map-added') );
	//*/
});
// init when fields show ...
acf.addAction( 'show_field', function( field ) {

	if ( 'open_street_map' !== field.type ) {
		return;
	}
	const editor = field.$el.find('[data-editor-config]').data( '_map_editor' );
	editor.update_visible();
});

acf.registerFieldType(acf.Field.extend({
	type: 'open_street_map'
}));

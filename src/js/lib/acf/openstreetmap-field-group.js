import L from 'leaflet/no-conflict';
import { MapInput } from 'media/views';

//  prevent map initialization in clone fields
document.addEventListener( 'acf-osm-map-create', e => e.target.closest('[data-id="acfcloneindex"]') && e.preventDefault() )

// const resetMap = map => {
// 	map.eachLayer(function(layer) { layer.remove() } );
// }

acf.registerFieldType( acf.Field.extend({
	type: 'open_street_map',
	wait: 'load',
	events: {
		// 'input input[name$="[center_lat]"]':'changeLat',
		// 'input input[name$="[center_lng]"]':'changeLng',
		// 'input input[name$="[zoom]"]':'changeZoom',
	},
	$map: function() {
		return this.$('.leaflet-map')
	},
	$lat: function() {
		return this.$el.closest('.acf-field-type-settings').find('input[name$="[center_lat]"]');
	},
	$lng: function() {
		return this.$el.closest('.acf-field-type-settings').find('input[name$="[center_lng]"]');
	},
	$zoom: function() {
		return this.$el.closest('.acf-field-type-settings').find('input[name$="[zoom]"]');
	},
	$layers: function() {
		return this.$el.closest('.acf-field-type-settings').find('select[name$="[layers][]"]');
	},
	// $osmLayers: function() {
	// 	return this.$el.closest('.acf-field-type-settings').find('select[name$="[layers]"]');
	// },
	// $layers: function() {
	// 	 return 'osm' === this.$returnFormat().filter(':checked').val()
	// 	 	? this.$osmLayers()
	// 		: this.$leafletLayers()
	// },
	$returnFormat: function() {
		return this.$el.closest('.acf-field-settings').find('input[name$="[return_format]"]');
	},
	initialize: function() {
		const mapDiv = this.$map().get(0)
		const osmLayers = Object.fromEntries( new Map(
			Object.values( acf_osm_admin.options.osm_layers ).map( key => [ key, L.tileLayer.provider(key) ])
		) )

		this.editor = MapInput.getByElement(mapDiv)
		this.leafletLayersControl = this.editor.layersControl;
		this.osmLayersControl     = L.control.layers( osmLayers, [], {
			collapsed: true,
			hideSingleBase: true,
		})

		this.bindListeners()
		this.setMapLayers(true)
	},
	setMapLnglat: function(e) {
		this.editor.map.panTo(
			{
				lng: parseFloat( this.$lng().val() ),
				lat: parseFloat( this.$lat().val() ),
			},
			{ animate: false, duration: 0 }
		);
	},
	setMapZoom: function(e) {
		this.editor.map.setZoom( parseInt( this.$zoom().val() ) )
	},
	setMapLayers: function() {
		const isDirty = acf.unload.changed
		const layers = this.editor.model.get('layers')
		this.editor.config.restrict_providers = 'osm' === this.$returnFormat().filter(':checked').val()
			? Object.values(acf_osm_admin.options.osm_layers)
			: false

		this.editor.resetLayers()
		this.editor.model.set( 'layers', layers )
		this.editor.initLayers()

		// dont let layer change affect confirm dialog
		if ( ! isDirty ) {
			acf.unload.stopListening()
		}
	},
	bindListeners: function() {
		// set input from map
		this.editor.model
			.on( 'change:lat',  () => this.$lat().val( this.editor.model.get('lat') ).trigger('change') )
			.on( 'change:lng',  () => this.$lng().val( this.editor.model.get('lng') ).trigger('change') )
			.on( 'change:zoom', () => this.$zoom().val( this.editor.model.get('zoom') ).trigger('change') )
			.on( 'change:layers', () => this.$layers().val( this.editor.model.get('layers') ).trigger('change') )

		// set map from input
		this.$lat().on( 'input', () => this.setMapLnglat() )
		this.$lng().on( 'input', () => this.setMapLnglat() )
		this.$zoom().on( 'input', () => this.setMapZoom() )

		this.$returnFormat().on( 'change', () => this.setMapLayers() )

	}
}) )


//  prevent map initialization in clone fields
document.addEventListener( 'acf-osm-map-create', e => e.target.closest('[data-id="acfcloneindex"]') && e.preventDefault() )

acf.registerFieldType( acf.Field.extend({
	type: 'open_street_map',
	$input: function() {
		return this.$('input.osm-json')
	},
	$map: function() {
		return this.$('.leaflet-map')
	},
	setup: function($field) {
		acf.Field.prototype.setup.apply(this,[$field])
		this.$map().get(0).addEventListener('osm-editor/initialized', e => {
			this.set('osmEditor',e.detail.view);
		})
	},
	initialize: function($field){
		const mapDiv = this.$map().get(0)
		mapDiv.addEventListener( 'osm-editor/create-marker', e => this.createMarker(e) )
		mapDiv.addEventListener( 'osm-editor/destroy-marker', e => this.destroyMarker(e) )
		mapDiv.addEventListener( 'osm-editor/update-marker-latlng', e => this.updateMarkerLatlng(e) )
		mapDiv.addEventListener( 'osm-editor/marker-geocode-result', e => this.geocodeResult(e) )
	},
	createMarker: function( e ) {
		const {  model } = e.detail
		console.log(this)
		acf.doAction('acf-osm/create-marker', model, this );
	},
	destroyMarker: function( e ) {
		const {  model } = e.detail
		console.log(this)
		acf.doAction('acf-osm/destroy-marker', model, this );
	},
	updateMarkerLatlng: function( e ) {
		const {  model } = e.detail
		console.log(this)
		acf.doAction('acf-osm/update-marker-latlng', model, this );
	},
	geocodeResult: function( e ) {
		const { model, geocode, previousGeocode } = e.detail
		console.log(this)
		acf.doAction('acf-osm/marker-geocode-result', model, this, geocode, previousGeocode );
	},
} ) );

// TODO: Conditionals
// module.exports = { OpenStreetmapField }


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
	getMapValue: function() {
		const editor = this.get('osmEditor')
		if ( editor ) {
			return editor.model.toJSON()
		}
		return JSON.parse( this.$input().val() )
	},
	countMarkers: function() {
		return this.getMapValue().markers?.length||0
	},
	setup: function($field) {
		const mapDiv = $field.get(0).querySelector('.leaflet-map')
		// reset map
		if ( mapDiv.matches('.leaflet-container') ) {
			// remove cusotm leaflet outer control areas
			$field.get(0).querySelectorAll('.leaflet-above,.leaflet-below').forEach( el => el.remove() )
			// reset class
			// create and init fresh clone
			const newMapDiv = mapDiv.cloneNode(false)
			newMapDiv.innerHTML = '';
			newMapDiv.setAttribute('class','leaflet-map')
			mapDiv.parentNode.replaceChild(newMapDiv, mapDiv);
			newMapDiv.dispatchEvent( new CustomEvent('acf-osm-map-added', { bubbles: true } ))
		} else { // init map
			mapDiv.dispatchEvent( new CustomEvent('acf-osm-map-added', { bubbles: true } ))
		}
		acf.Field.prototype.setup.apply( this, [ $field ] )
		this.$map().get(0).addEventListener('osm-editor/initialized', e => {
			this.set('osmEditor',e.detail.view);
		})
	},
	initialize: function(){
		const mapDiv = this.$map().get(0)
		mapDiv.addEventListener( 'osm-editor/create-marker', e => this.createMarker(e) )
		mapDiv.addEventListener( 'osm-editor/destroy-marker', e => this.destroyMarker(e) )
		mapDiv.addEventListener( 'osm-editor/update-marker-latlng', e => this.updateMarkerLatlng(e) )
		mapDiv.addEventListener( 'osm-editor/marker-geocode-result', e => this.geocodeResult(e) )
	},
	createMarker: function( e ) {
		const {  model } = e.detail
		acf.doAction('acf-osm/create-marker', model, this );
	},
	destroyMarker: function( e ) {
		const {  model } = e.detail
		acf.doAction('acf-osm/destroy-marker', model, this );
	},
	updateMarkerLatlng: function( e ) {
		const {  model } = e.detail
		acf.doAction('acf-osm/update-marker-latlng', model, this );
	},
	geocodeResult: function( e ) {
		const { model, geocode, previousGeocode } = e.detail
		acf.doAction('acf-osm/marker-geocode-result', model, this, geocode, previousGeocode );
	},
} ) );

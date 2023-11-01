
const mapDrawProxomity = ( field, L ) => {

	const map = field.get('osmEditor').map
	const proximityField = acf.getField( field.$el.next('[data-name="proximity"]') )
	const cirle = L.circle(
		map.getCenter(),
		{
			radius: 1000 * proximityField.val(),
			interactive: false,
			pane: 'markerPane'
		}
	).addTo(map)

	cirle.setStyle({
		fillColor: '#2271b1',
		color: '#2271b1',
	})

	// circle events
	proximityField.$input().on( 'change', e => {
		cirle.setRadius( 1000 * proximityField.val() )
	})
	map.on( 'move', () => {
		cirle.setLatLng( map.getCenter())
	})
}

document.addEventListener('acf-osm-map-created', e => {
	const { L, map } = e.detail;
	const fieldEl = e.target.closest('.acf-field[data-type="open_street_map"]')

	if ( fieldEl.matches( '.pp-draw-proximity' ) ) {
		mapDrawProxomity( acf.getField( fieldEl.getAttribute('data-key') ), L )
	}
})

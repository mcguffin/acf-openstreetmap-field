const mapDrawCenter = ( field, L ) => {
	const map = field.get('osmEditor').map

	const addressField  = acf.getField( field.$el.parent().find('[data-name="address_line_1"]').attr('data-key') )
	const postcodeField = acf.getField( field.$el.parent().find('[data-name="postcode"]').attr('data-key') )
	const cityField     = acf.getField( field.$el.parent().find('[data-name="city"]').attr('data-key') )
	const reverseBtn    = field.$el.next('[data-name="actions"]').find('[data-action="reverse"]').get(0)
	const geocodeBtn    = field.$el.next('[data-name="actions"]').find('[data-action="geocode"]').get(0)
	const geocoder      = L.Control.Geocoder.nominatim()
	const cirle = L.circle(
		map.getCenter(),
		{
			radius: 0,
			weight: 5,
			interactive: false,
			pane: 'markerPane'
		}
	).addTo(map)
	map.on( 'move', () => {
		cirle.setLatLng( map.getCenter())
	})

	// get lat/lng from address
	geocodeBtn.addEventListener('click', e => {
		const query = `${addressField.val()} ${postcodeField.val()} ${cityField.val()}`
		geocoder.geocode( query, geocodeResult => {
			if ( ! geocodeResult.length ) {
				return
			}
			map.flyTo(geocodeResult[0].center, 15)
		} )
	})

	// get address from lat/lng
	reverseBtn.addEventListener('click', e => {
		geocoder.reverse(map.getCenter(), map.options.crs.scale( 20 ), geocodeResult => {
			const result = geocodeResult.constructor === Array
				? geocodeResult[0]
				: geocodeResult
			if ( ! result?.properties?.address ) {
				return
			}
			const city         = [result.properties.address.city, result.properties.address.town, result.properties.address.village,''].find( el => el!==undefined )
			const postcode     = [result.properties.address.postcode,''].find( el => el!==undefined )
			const road         = [result.properties.address.road,''].find( el => el!==undefined )
			const house_number = [result.properties.address.house_number,''].find( el => el!==undefined )
			addressField.val(`${road} ${house_number}`.trim())
			postcodeField.val(`${postcode}`)
			cityField.val(`${city}`.trim())
		} )
	})
}

document.addEventListener('acf-osm-map-created', e => {

	const { L, map } = e.detail;
	const fieldEl = e.target.closest('.acf-field[data-type="open_street_map"]')

	if ( !! fieldEl && fieldEl.matches( '.pp-draw-center' ) ) {
		mapDrawCenter( acf.getField( fieldEl.getAttribute('data-key') ), L )
	}
})

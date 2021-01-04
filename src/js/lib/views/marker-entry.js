import { i18n } from 'pluginAdminOptions';

const entryTemplate = `<div class="osm-marker">
	<div class="acf-osm-input-row">
		<a class="acf-osm-prefix acf-osm-icon-btn acf-osm-tooltip" data-name="locate-marker" title="${i18n.locate_marker}">
			<span class="dashicons dashicons-location"></span>
		</a>
		<input type="text" data-name="label" />
		<a class="acf-osm-suffix acf-osm-icon-btn acf-osm-tooltip" href="#" data-name="remove-marker" title="${i18n.remove_marker}">
			<span class="dashicons dashicons-minus" aria-hidden="true"></span>
		</a>
	</div>
	<div class="latlng">
		<span data-label="lat"></span> <span data-label="lng"></span>
	</div>
	<input type="hidden" data-name="default_label" />
	<input type="hidden" data-name="lat" />
	<input type="hidden" data-name="lng" />
	<input type="hidden" data-name="data" />
</div>`;

module.exports = {
	getMarkerEntry: (markerData, marker) => {
		let el
		const div = document.createElement('div');
		div.innerHTML = entryTemplate
		el = div.firstChild


		const hilite = () => {
			el.classList.add('focus')
			marker.getElement().classList.add('focus')
		}
		const lolite = () => {
			el.classList.remove('focus')
			marker.getElement().classList.remove('focus')
		}

		Object.assign(el, {
			setValue: (k,v) => {
				const inp = el.querySelector(`input[data-name="${k}"]`)
				const label = el.querySelector(`[data-label="${k}"]`)
				if ( inp instanceof Node ) {
					if ( v instanceof Object ) {
						inp.value = JSON.stringify(v)
					} else {
						inp.value = v
					}
				}
				if ( label instanceof Node && !( v instanceof Object ) ) {
					label.textContent = v
				}
			},
			getValue: (k = null) => {
				const ret = {};
				if ( k === null ) {
					['lat','lng','label','default_label','data'].forEach( prop => {
						ret[prop] = el.getValue(prop)
					} )
					return ret;
				}
				const inp = el.querySelector(`input[data-name=${k}]`)
				if ( inp instanceof Node ) {
					if ( 'data' === k ) {
						try {
							return JSON.parse( inp.value )
						} catch(err) {
							return {}
						}
					} else if ( ['lat','lng'].includes(k) ) {
						return parseFloat(inp.value.split(',').join('.'))
					}
					return inp.value
				}
			}
		})

		// set values
		Object.keys(markerData).forEach( k => el.setValue( k, markerData[k] ) )

		let locateUI = el.querySelector('[data-name="locate-marker"]'),
			removeUI = el.querySelector('[data-name="remove-marker"]'),
			labelUI = el.querySelector('[data-name="label"]'),
			latUI  = el.querySelector('[data-name="lat"]'),
			lngUI = el.querySelector('[data-name="lng"]');

		locateUI.addEventListener('click', e => {
			marker._map.flyTo( marker.getLatLng() )
			marker.getElement().focus()
		})
		removeUI.addEventListener('click', e => {
			marker.remove()
		})
		labelUI.addEventListener('keyup', e => {
			let val = e.target.value,
				latlng
			if ( '' === val.trim() ) {
				latlng = marker.getLatLng()
				val = `${latlng.lat}, ${latlng.lng}`
			}
			marker.getTooltip().setContent( val )
		})
		labelUI.addEventListener('focus', e => {
			hilite()
		})
		labelUI.addEventListener('blur', e => {
			let val = e.target.value
			if ( '' === val.trim() ) {
				/*
				let latlng = marker.getLatLng()
				el.setValue( 'label', `${latlng.lat}, ${latlng.lng}` )
				/*/
				el.setValue( 'label', el.getValue('default_label') )
				//*/
			}
			lolite()
		})

		marker.on('add',e => {
			const icn = marker.getElement()
			
			icn.addEventListener( 'focus', e => hilite() )
			icn.addEventListener( 'blur', e => lolite() )
		})		
		
		
		latUI.addEventListener('change',e => {
			let latlng = marker.getLatLng()
			latlng.lat = parseFloat( e.target.value )
			marker.setLatLng( latlng )
		})
		lngUI.addEventListener('change',e => {
			let latlng = marker.getLatLng()
			latlng.lng = parseFloat( e.target.value )
			marker.setLatLng( latlng )
		})
		return el

	}
}
import { L } from 'maps';
import { i18n } from 'pluginAdminOptions';


const entryTemplate = `<div class="leaflet-marker-entry">
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
	<input type="hidden" data-name="lat" />
	<input type="hidden" data-name="lng" />
</div>`;

/**
 *	@param Object markerData {
 *		lng:<float>,
 *		lat:<float>,
 *		label:<string>,
 *		default_label:<string>,
 *		data:<object>,
 *	}
 *	@param L.Marker marker
 */
const getMarkerEntry = (markerData, marker) => {
	let el
	const div = L.DomUtil.create('div')
	div.innerHTML = entryTemplate
	el = div.firstChild

	// append hidden inputs for unknown marker data
	Object.keys(markerData).forEach( k => {

		if ( ['lat','lng','label'].includes(k) ) {
			return
		}

		const hidden = L.DomUtil.create('input')
		hidden.type = 'hidden'
		hidden.setAttribute( 'data-name', k )
		el.append(hidden)
	} )

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








L.Control.MarkerList = L.Control.extend({
	options: {
		position: 'topright',
		title: '',
		className: 'leaflet-control-marker-list',
		getMarkerDataCb: m => m
	},
	initialize: function(options) {
		L.Util.setOptions(this, options);
		this._layerGroup = L.layerGroup()
	},
	addEntry: function(marker) {
		this._container.append()
	},
	onAddMarker: function(e) {
		if ( e.layer.constructor === L.Marker ) {
			this._layerGroup.addLayer( e.layer )
			const latlng = e.layer.getLatLng()
			const markerData = Object.assign( {
				lng:latlng.lng,
				lat:latlng.lat,
				label:e.layer.options.title,
			}, e.layer.options.rawData ? e.layer.options.rawData : {} )
			const entry = getMarkerEntry( markerData, e.layer )
			e.layer._markerEntry = entry
			this._container.append( entry )
		}
	},
	onRemoveMarker: function(e) {
		if ( e.layer.constructor === L.Marker && this._layerGroup.hasLayer( e.layer ) ) {
			this._layerGroup.removeLayer( e.layer )
			if ( !! e.layer._markerEntry ) {
				e.layer._markerEntry.remove()
			}
		}
	},
    onAdd:function(map) {

		this.layer = !! this.options.layer ? this.options.layer : map
		
        this._container = L.DomUtil.create('div', this.options.className );
		
		// this.layer.on('layeradd',e => {
		// 	console.log('layer',e)
		// })
		map.on('layeradd', this.onAddMarker, this )
		map.on('layerremove', this.onRemoveMarker, this )

        return this._container;
    },
    onRemove:function() {
        // L.DomEvent
        //     .off(this._link, 'click', L.DomEvent.stopPropagation )
        //     .off(this._link, 'click', L.DomEvent.preventDefault )
		map.off('layeradd', this.onAddMarker, this )
		map.off('layerremove', this.onRemoveMarker, this )
    },
})

L.control.markerList = function (options) {
    return new L.Control.MarkerList(options);
};




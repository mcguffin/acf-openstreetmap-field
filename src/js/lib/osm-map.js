import L from 'leaflet/no-conflict';
import 'leaflet/tile-layer-provider';

(function( arg ){

	const leafletMapSelector = '[data-map="leaflet"]';

	const camelCase = str => {
		return str.replace( /[-_\s.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '' ).replace(/\s+/g, '');
	}

	const isVisible = el => {
		return !! ( el.offsetWidth || el.offsetHeight || el.getClientRects().length )
	}

	const parseDataAttributes = el => {
		const data = {}
		Array.from(el.attributes).forEach( attr => {
			let prop, val
			if ( attr.name.indexOf('data-') === 0 ) {
				prop = camelCase( attr.name.substr(5) )

				try {
					val = JSON.parse(attr.value)
				} catch (err) {
					val = attr.value
				}
				data[ prop ] = val
			}
		})
		return data;
	}

	/**
	 *	@param HTMLElement el Map Div
	 *	@return boolean
	 */
	const acfLeaflet = el => {
		if ( !! el.acfOsmMap ) {
			return false
		}

		let map, maxzoom,
			initEvt;

		const data = parseDataAttributes( el ),
			mapInit = {
				scrollWheelZoom: false,
				center: [ bulletproofParseFloat(data.mapLat), bulletproofParseFloat(data.mapLng) ],
				zoom: data.mapZoom,
				tap: false,
				worldCopyJump: true,
			},
			createEvt = new CustomEvent( 'acf-osm-map-create', {
				bubbles: true,
				cancelable: true,
				detail: {
					mapInit: mapInit,
					L: L
				},
			});

		el.dispatchEvent( createEvt )

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}

		el.style.height = data.height + 'px';

		map = L.map( el, createEvt.detail.mapInit ); // map init might have been mutated by event listeners
		el.acfOsmMap = map;
		// $(this).data( 'acf-osm-map', map );

		initEvt = new CustomEvent( 'acf-osm-map-init', {
			detail: {
				map: map,
				L: L
			},
			cancelable: true,
			bubbles: true
		})
		el.dispatchEvent( initEvt )

		// allow to skip initialization
		if ( initEvt.defaultPrevented ) {
			return;
		}

		createLayers.apply( el, [ data, map ] );

		createMarkers.apply( el, [ data, map ] );

		// reload hidden maps when they become visible
		if ( ! isVisible(el) ) {
			visibilityObserver.observe(el);
		}

		el.addEventListener( 'acf-osm-show', e => {
			map.invalidateSize();
		} )

		// finished!
		el.dispatchEvent( new CustomEvent( 'acf-osm-map-created', {
			bubbles: true,
			detail: {
				map: map,
				L: L
			}
		 } ) )
		 return true
	}

	const maybeAcfLeaflet = el => {
		if ( ! acfLeaflet( el ) ) {
			el.dispatchEvent( new CustomEvent( 'acf-osm-show', {
				detail: { L: L }
			} ) );
		}
	}

	const visibilityObserver = new ResizeObserver( function(entries,observer) {
		entries.forEach(function(entry){
			// @ see https://github.com/jquery/jquery/blob/a503c691dc06c59acdafef6e54eca2613c6e4032/test/data/jquery-1.9.1.js#L7469-L7481
			if ( isVisible(entry.target) ) {
				entry.target.dispatchEvent( new CustomEvent( 'acf-osm-show', {
					detail: { L: L }
				} ) );
				observer.unobserve(entry.target);
			}
		})
	});


	// observe if new maps are being loaded into the dom
	if ( !! MutationObserver ) {
		const domObserver = new MutationObserver( function(entries,observer) {
			entries.forEach( entry => {
				let mapElement
				if ( mapElement = entry.target.querySelector(leafletMapSelector) ) {
					maybeAcfLeaflet( mapElement )
				} else{
					entry.target.querySelectorAll( leafletMapSelector ).forEach( maybeAcfLeaflet )
				}
			})
		});
		window.addEventListener('DOMContentLoaded', e => {
			domObserver.observe(document.body, { subtree: true, childList: true } );
		})
	}


	// #64
	const bulletproofParseFloat = value => {
		// already a number
		if ( 'number' === typeof value ) {
			return value;
		}
		if ( 'string' === typeof value ) {
			// some messed around with value
			if ( value.indexOf('.') === -1 && value.indexOf(',') !== -1 ) {
				value = value.split(',').join('.')
			}
			return parseFloat( value )
		}
		return NaN
	}


	// L.TileLayer.Provider.providers = arg.providers;
	const options = arg.options;

	function createMarkers( data, map ) {
		// const self = this, // @var DIV element
			/*
			createEvt = $.Event({
				type: 'acf-osm-map-create-markers',
			}),
			/*/
		const createEvt = new CustomEvent('acf-osm-map-create-markers', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					mapData: data,
					L: L
				}
			} ),
			//*/
			default_marker_config = {};

		this.dispatchEvent( createEvt )

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}

		// markers ...
		if ( arg.options.marker.html !== false ) {
			default_marker_config.icon = L.divIcon({
				html: arg.options.marker.html,
				className: arg.options.marker.className
			});
		} else if ( arg.options.marker.icon !== false ) {
			default_marker_config.icon = new L.icon( arg.options.marker.icon );
		}


		data.mapMarkers?.forEach( (markerData, i ) => {
			// add markers
			let marker;

			const createEvt = new CustomEvent( 'acf-osm-map-marker-create', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					markerData: markerData,
					markerOptions: Object.assign( default_marker_config, {
						label: markerData.label // <= TODO: deprecate this!
					} ),
					L: L
				}
			} );
			this.dispatchEvent( createEvt )

			if ( createEvt.defaultPrevented ) {
				return;
			}

			marker = L.marker(
					L.latLng( bulletproofParseFloat( createEvt.detail.markerData.lat ), bulletproofParseFloat( createEvt.detail.markerData.lng ) ),
					createEvt.detail.markerOptions
				)
				.bindPopup( createEvt.detail.markerOptions.label )
				.addTo( map );

			this.dispatchEvent(new CustomEvent('acf-osm-map-marker-created',{
				bubbles: true,
				detail: { map, marker, L }
			}))
		} )
		// markers again


	}

	function createLayers( data, map ) {
		let maxzoom;

		const createEvt = new CustomEvent( 'acf-osm-map-create-layers', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					mapData: data,
					L: L
				}
			});

		this.dispatchEvent( createEvt );

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}

		maxzoom = 100;


		// layers ...

		data.mapLayers.forEach( (provider_key, i) => {

			if ( 'string' !== typeof provider_key ) {
				return;
			}

			const layer = L.tileLayer.provider( provider_key ).addTo( map );

			layer.providerKey = provider_key;

			if ( !! layer.options.maxZoom ) {
				maxzoom = Math.min( layer.options.maxZoom, maxzoom )
			}

		} )
		map.setMaxZoom( maxzoom );
	}

	window.addEventListener('DOMContentLoaded', e => {
		document.querySelectorAll( leafletMapSelector ).forEach( acfLeaflet )
		// domObserver.observe( document.body, { subtree: true, childList: true } );
	})
	document.addEventListener('acf-osm-map-added', e => {
		if ( e.target.matches( leafletMapSelector ) ) {
			acfLeaflet( e.target )
		} else {
			document.querySelectorAll( leafletMapSelector, acfLeaflet )
		}
	})

})( acf_osm );

module.exports = L

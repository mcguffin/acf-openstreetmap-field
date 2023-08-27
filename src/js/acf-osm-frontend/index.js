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

	const acfLeaflet = el => {
		if ( !! el.acfOsmMap ) {
			return
		}

		// if ( $(this).data( 'acf-osm-map' ) ) {
		// 	return;
		// }
		const data = parseDataAttributes( el ),
			mapInit = {
				scrollWheelZoom: false,
				center: [ bulletproofParseFloat(data.mapLat), bulletproofParseFloat(data.mapLng) ],
				zoom: data.mapZoom,
				tap: false
			},
			createEvt = new CustomEvent( 'acf-osm-map-create', {
				bubbles: true,
				cancelable: true,
				detail: {
					mapInit: mapInit
				},
			});

		let map, maxzoom,
			initEvt;
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
				map: map
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
			el.addEventListener( 'acf-osm-show', e => {
				map.invalidateSize();
			}, { once: true } )
		}

		// finished!
		el.dispatchEvent( new CustomEvent( 'acf-osm-map-created', {
			bubbles: true,
			detail: {
				map: map
			}
		 } ) )
		
	}

	
	const visibilityObserver = new ResizeObserver( function(entries,observer) {
		entries.forEach(function(entry){
			// @ see https://github.com/jquery/jquery/blob/a503c691dc06c59acdafef6e54eca2613c6e4032/test/data/jquery-1.9.1.js#L7469-L7481
			if ( isVisible(entry.target) ) {
				entry.target.dispatchEvent( new CustomEvent( 'acf-osm-show' ) );
				observer.unobserve(entry.target);
			}
		})
	});


	// observe if new maps are being loaded into the dom
	if ( !! MutationObserver ) {
		var domObserver = new MutationObserver( function(entries,observer) {
			entries.forEach( entry => {
				if ( entry.target.matches(leafletMapSelector) ) {
					acfLeaflet(entry.target)
				}
				entry.target.querySelectorAll( leafletMapSelector ).forEach( acfLeaflet )
			})
		});
		window.addEventListener('DOMContentLoaded', e => {
			domObserver.observe(document.body, { subtree: true, childList: true } );
		})
	}

	// #64
	var bulletproofParseFloat = function( value ) {
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


	L.TileLayer.Provider.providers = arg.providers;

	var options = arg.options;
	
	function createMarkers( data, map ) {
		var self = this, // @var DIV element
			/*
			createEvt = $.Event({
				type: 'acf-osm-map-create-markers',
			}),
			/*/
			createEvt = new CustomEvent('acf-osm-map-create-markers', { 
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					mapData: data
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


		data.mapMarkers.forEach( (markerData, i ) => {
			// add markers
			var marker, createEvt;

			createEvt = new CustomEvent( 'acf-osm-map-marker-create', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					markerData: markerData,
					markerOptions: Object.assign( default_marker_config, {
						label: markerData.label
					} ),
				}
			} );
			self.dispatchEvent( createEvt )

			if ( createEvt.defaultPrevented ) {
				return;
			}

			marker = L.marker(
					L.latLng( bulletproofParseFloat( createEvt.detail.markerData.lat ), bulletproofParseFloat( createEvt.detail.markerData.lng ) ),
					createEvt.detail.markerOptions
				)
				.bindPopup( createEvt.detail.markerOptions.label )
				.addTo( map );

			self.dispatchEvent(new CustomEvent('acf-osm-map-marker-created',{
				detail: {
					marker: marker
				}
			}))			
		} )
		// markers again


	}

	function createLayers( data, map ) {
		var createEvt = new CustomEvent( 'acf-osm-map-create-layers', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					mapData: data,
				}
			}),
			maxzoom;

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

			var layer_config = options.layer_config[ provider_key.split('.')[0] ] || { options: {} },
				layer = L.tileLayer.provider( provider_key, layer_config.options ).addTo( map );

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

	// 
	// $.fn.extend({
	// 	acf_leaflet:function() {
	// 
	// 		return this.each( function( i, el ) {
	// 
	// 		});
	// 	}
	// });
	// // static mathod
	// $.extend({
	// 	acf_leaflet:function() {
	// 		return $('[data-map="leaflet"]').acf_leaflet();
	// 	}
	// });
	// init all maps
	// $(document).ready( $.acf_leaflet );
	// 
	// // listen to events
	// $(document).on( 'acf-osm-map-added', function(e) {
	// 	if ( $(e.target).is( '[data-map="leaflet"]') ) {
	// 		$(e.target).acf_leaflet();
	// 	} else {
	// 		$.acf_leaflet();
	// 	}
	// });

})( acf_osm );

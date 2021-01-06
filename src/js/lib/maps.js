/**
 *	Main frontend script
 */
import ResizeObserver from 'resize-observer-polyfill';
import leaflet from 'leaflet';
import 'leaflet-providers';
import { factory as layerFactory } from 'layers/index'
import { options, providers } from 'pluginOptions'
import { isVisible } from 'dom/is-visible'

const L = leaflet
console.log(options)
console.log(providers)
let domObserver

const mapSelector = '[data-map="leaflet"][data-map-version]'
const visibilityObserver = new ResizeObserver( function(entries,observer) {
	entries.forEach( entry => {
		// @see https://github.com/jquery/jquery/blob/a503c691dc06c59acdafef6e54eca2613c6e4032/test/data/jquery-1.9.1.js#L7469-L7481
		if ( isVisible( entry.target ) ) {
			entry.target.dispatchEvent( new CustomEvent( 'acf-osm-show', {
				bubbles: true,
				cancelable: false,
			}) );
			observer.unobserve(entry.target);
		}
	})
});

console.log(L.TileLayer)
console.log(L.TileLayer.Provider)
// setup configured providers
L.TileLayer.Provider.providers = providers;


// observe if new maps are being loaded into the dom
if ( !! MutationObserver ) {
	domObserver = new MutationObserver( function(entries,observer) {
		entries.forEach(function(entry){
			if ( entry.target.matches(mapSelector) ) {
				setupMap(entry.target)
			}
			if ( entry.target.querySelectorAll(mapSelector).length ) {
				entry.target.querySelectorAll(mapSelector).forEach( setupMap )
			}
		})
	});
}

const setupMap = el => {
	if ( ! el.hasAttribute('data-map') || !! el._leaflet_id ) {
		return
	}
	let map, initEvt
	const data = {
			layers: JSON.parse( el.getAttribute('data-map-layers') ),
			height: parseInt( el.getAttribute('data-height') ),
			lat: parseFloat( el.getAttribute('data-map-lat') ),
			lng: parseFloat( el.getAttribute('data-map-lng') ),
			zoom: parseInt( el.getAttribute('data-map-zoom') ),
		},
		mapInit = {
			scrollWheelZoom: false,
			center: [ data.lat, data.lng ],
			zoom: data.zoom,
			rotate:true
		},
		createEvt = new CustomEvent( 'acf-osm-map-create', {
			bubbles: true,
			cancelable: true,
			detail: {
				mapInit: mapInit
			},
		});

	el.dispatchEvent( createEvt )

	// allow to skip map creation
	if ( createEvt.defaultPrevented ) {
		return
	}

	el.style.height = `${data.height}px`;

	map = L.map( el, createEvt.detail.mapInit ); // map init might have been mutated by event listeners

	//$(el).data( 'acf-osm-map', map );

	initEvt = new CustomEvent( 'acf-osm-map-init', {
		detail: {
			map: map,
			leaflet: L
		},
		cancelable: true,
		bubbles: true
	});

	el.dispatchEvent( initEvt )

	// allow to skip initialization
	if ( initEvt.defaultPrevented ) {
		return;
	}

	// create layers
	data.layers.map( layerData => {
		layerFactory(layerData).map = map
	} )

	// reload hidden maps when they become visible
	if ( ! isVisible(el) ) {
		visibilityObserver.observe(el);
		el.addEventListener( 'acf-osm-show', e => map.invalidateSize(), { once: true } )
	}

	// // finished!
	el.dispatchEvent( new CustomEvent( 'acf-osm-map-created', {
		bubbles: true,
		detail: {
			map: map
		}
	 } ) )

}

const setupMaps = () => {
	document.querySelectorAll(mapSelector).forEach( setupMap )
	!!domObserver && domObserver.observe( document.body, { subtree: true, childList: true } );
}

const init = () => {
	if ( 'complete' === document.readyState ) {
		setupMaps()
	} else {
		document.addEventListener( 'DOMContentLoaded', setupMaps, { once: true } );	
	}	
}

module.exports = { init, L }
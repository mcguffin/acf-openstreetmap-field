import { init as mapsInit, L } from 'maps';

import ResizeObserver from 'resize-observer-polyfill';
import 'leaflet-providers';
import { factory as controlFactory } from 'controls/index'
import { options, providers } from 'pluginOptions'
import { options as adminOptions, i18n } from 'pluginAdminOptions'
import { addOutsideControlCorner } from 'leaflet/control-corner';

import reactTriggerChange from 'react-trigger-change';

class MapAdmin {
	/** @var Array */
	#controls = {}
	/** @var L.Map */
	#map
	/** @var Object */
	#value = adminOptions.default_map
	/** @var Node */
	#input
	
	cb = {
		providers: val => this.updateProviders(val),
		markers: val => this.updateMarkers(val),
	}
	
	get input() {
		return this.#input
	}
	set input(input) {
		this.#input = input
		try {
			this.#value = JSON.parse( input.value )
		} catch(err) {
			this.#value = {}
			console.error('[ACF OpenStreetMap]',input,input.value)
		}
	}
	
	get value() {
		return this.#value
	}

	set value( value ) {
		const prevValue = JSON.stringify(this.#value),
			inputEvent = document.createEvent('HTMLEvents')
			
			    event
		this.#value = value
		this.input.value = JSON.stringify( value )
		// required in widget editor
		if ( this.input.value !== prevValue ) {
			this.input.dispatchEvent( new Event( 'change', { bubbles: true } ) )
			reactTriggerChange( this.input )
		}

		// const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
		// nativeInputValueSetter.call( this.input, 'react 16 value');
		// this.input.dispatchEvent( new Event( 'change', { bubbles: true } ) );

	}

	constructor( map ) {
		this.#map = map
	}

	addControl( controlConfig ) {
		if ( !! this.#controls[ controlConfig.type ] ) {
			return
		}
		this.#controls[ controlConfig.type ] = controlFactory( { ...controlConfig, map: this.#map, cb: ctrl => { 
			this.value = ctrl.mutateMap( Object.assign( {}, this.value ) ); 
		} } )
		return this.#controls[ controlConfig.type ]
	}
	getControl( controlType ) {
		if ( 'object' === typeof controlType ) {
			controlType = controlType.type
		}
		if ( ! this.#controls[ controlType ] ) {
			return false
		}
		return this.#controls[ controlType ]
	}

	removeControl( controlType ) {
		if ( 'object' === typeof controlType ) {
			controlType = controlType.type
		}
		if ( ! this.#controls[ controlType ] ) {
			return
		}
		this.#controls[ controlType ].resetControl()
		delete( this.#controls[ controlType ] )
	}

}


document.addEventListener( 'acf-osm-map-init', e => {
	// don't init widget-templates on admin page and customizer
	if ( null !== e.target.closest('#widget-list' ) || null !== e.target.closest('#available-widgets-list') ) {
		e.preventDefault(); // don't init map …
		return // … and don't init admin
	}
	if ( ! e.target.hasAttribute('data-map-controls') ) {
		return // it's just a map, don't init admin
	}

	// get input from data-target-input-element OR data-target-input-getter
	let input

	const controls = JSON.parse( e.target.getAttribute('data-map-controls') )
	const admin = new MapAdmin( e.detail.map );
	const initEvt = new CustomEvent( 'acf-osm-map-admin-init', {
			detail: {
				map: e.detail.map,
				mapAdmin: admin,
				mapControls: controls,
			},
			cancelable: true,
			bubbles: true
		});

	e.detail.map.getContainer().dispatchEvent( initEvt )

	if ( initEvt.defaultPrevented ) {
		return;
	}

	addOutsideControlCorner( e.detail.map, 'top' )
//	addOutsideControlCorner( e.detail.map, 'left' ) // later …
	addOutsideControlCorner( e.detail.map, 'bottom' )
//	addOutsideControlCorner( e.detail.map, 'right' )

	initEvt.detail.mapControls.map( controlConfig => {
		admin.addControl( controlConfig )
	} )
	
	if ( e.target.matches( '[data-target-input-element]' ) ) {
		admin.input = e.target.parentNode.querySelector( e.target.getAttribute( 'data-target-input-element' ) )
	} else if ( e.detail.map.getContainer().querySelector('input') ) {
		admin.input = e.detail.map.getContainer().querySelector('input')
	} else {
		// fallback
		input = document.createElement('input')
		input.type = 'hidden'
		input.value = JSON.stringify( adminOptions.default_map )
		admin.input = input
		
	}

	e.detail.map.getContainer().dispatchEvent( new CustomEvent( 'acf-osm-map-admin-created', {
		detail: {
			map: e.detail.map,
			mapAdmin: admin,
			mapControls: controls,
		},
		cancelable: false,
		bubbles: true
	}) )

	// set event map init data equal to what is found in input
} )

mapsInit()

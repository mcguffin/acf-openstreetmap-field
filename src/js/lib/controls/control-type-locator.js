import { ControlType, registerControlType } from 'controls/control-type'
//import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions';
import { options as adminOptions, i18n } from 'pluginAdminOptions';
import { L } from 'maps';
//import 'leaflet.locatecontrol';



const LocatorControl = L.Control.extend({
	initialize: function(options) {
		
		L.Util.setOptions(this, options);

		this._accuracyMarker = L.circle( L.latLng(0,0), {
			radius: 1,
			stroke: true,
			color: '#cccccc',
			weight: 1,
			opacity: 1,
			fillColor: '#ffffff',
			fillOpacity: 0.2,
			className: 'leaflet-control-locator-accuracy',
			interactive: false
		});
		this._locationIcon = L.divIcon({
			className: 'leaflet-control-locator-location',
			iconSize: [ 16, 16 ],
			iconAnchor: [ 8, 8 ],
		});
		this._locationMarker = L.marker([0,0], {
			icon: this._locationIcon,
			interactive: false
		});

		this._drawsMarkers = false;
	},
	onAdd:function() {
		if ( ! ( 'geolocation' in navigator ) ) {
			return; // needs testing!
		}
		
		const self = this

		this._container = L.DomUtil.create('div',
			'leaflet-control-locator leaflet-bar leaflet-control');

		this._container.setAttribute( 'data-status', 'idle' )

		this._link = L.DomUtil.create('a', 'acf-osm-tooltip leaflet-bar-part leaflet-bar-part-single', this._container);
		this._link.title = i18n.my_location;
		this._icon = L.DomUtil.create('span', 'dashicons dashicons-location-alt', this._link);
		L.DomEvent
			.on( this._link, 'click', L.DomEvent.stopPropagation)
			.on( this._link, 'click', L.DomEvent.preventDefault)
			.on( this._link, 'click', this.clickHandler, this)
			.on( this._link, 'dblclick', L.DomEvent.stopPropagation)
			.on( this._map, 'locationfound', this.foundHandler, this )
			.on( this._map, 'locationerror', this.errorHandler, this );
			L.DomEvent.stopPropagation
		
		this.__orig_stopLocate = this._map.stopLocate;
		this._map.stopLocate = function() {
			self._container.setAttribute( 'data-status', 'idle' )
			self.__orig_stopLocate.apply( self._map, arguments )
			self._drawMarkers(false)
		}

		return this._container;
	},
	onRemove:function() {
		this._drawMarkers(false)
		L.DomEvent
			.off(this._link, 'click', L.DomEvent.stopPropagation )
			.off(this._link, 'click', L.DomEvent.preventDefault )
			.off(this._link, 'click', this.clickHandler, this )
			.off(this._link, 'dblclick', L.DomEvent.stopPropagation )
			.off( this._map, 'locationfound', this.foundHandler, this )
			.off( this._map, 'locationerror', this.errorHandler, this );

		this._map.stopLocate = this.__orig_stopLocate;

	},
	clickHandler: function() {
		const status = this._container.getAttribute( 'data-status' )
		if ( ['waiting','active','fetching'].includes(status) ) {
			this.stop()
		} else if ( ['idle','error'].includes(status) ) {
			this.start()
		}
	},
	foundHandler: function(e) {
		
		this._container.setAttribute( 'data-status', 'active' )
		
		this._map.flyTo( e.latlng )
		
		this._locationMarker
			.setLatLng( e.latlng );

		this._accuracyMarker
			.setLatLng( e.latlng )
			.setRadius( e.accuracy );

		this._drawMarkers(true)

	},
	errorHandler: function(err) {
		// show Error state in button
		if ( err.code === 1 ) {
			this._container.setAttribute( 'data-status', 'error' )
			this._drawMarkers(false)			
		} else if ( err.code === 3 ) {
			this._container.setAttribute( 'data-status', 'fetching' )
		}
	},
	start: function() {
		this._container.setAttribute( 'data-status', 'waiting' )
		this._map.locate( { 
			watch: true,
			setView: false,
			enableHighAccuracy: true
		} )
	},
	stop: function() {
		this._container.setAttribute( 'data-status', 'idle' )
		this.__orig_stopLocate.apply( this._map )
		this._drawMarkers(false)
	},
	_drawMarkers:function( state ) {
		if ( ! state && this._drawsMarkers ) {
			this._locationMarker.removeFrom(this._map);
			this._accuracyMarker.removeFrom(this._map);
			this._drawsMarkers = false;
		} else if ( state && ! this._drawsMarkers ) {
			this._locationMarker.addTo(this._map);
			this._accuracyMarker.addTo(this._map);
			this._drawsMarkers = true;			
		}
			

	}
})

L.Control.LocatorControl = LocatorControl;
L.control.addLocatorControl = function (options) {
	return new L.Control.LocatorControl(options);
};


class ControlTypeLocator extends ControlType {

	setupControl() {
		this.locator = L.control.addLocatorControl({
			position: 'bottomleft'
		}).addTo( this.map );
	}
	resetControl() {
		this.locator.remove()
	}
}

registerControlType( 'locator', ControlTypeLocator )
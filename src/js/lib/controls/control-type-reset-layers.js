import { ControlType, registerControlType } from 'controls/control-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'
import { L } from 'maps';

L.Control.ResetLayers = L.Control.extend({
	onAdd:function() {
		this._default_layers = JSON.parse( this._map.getContainer().getAttribute('data-map-layers') )
			.filter( layer => layer.type === 'provider' );

		this._container = L.DomUtil.create('div',
			'leaflet-control-add-location-marker leaflet-bar leaflet-control');

		this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container);
		//this._link.title = i18n.add_marker_at_location;
		this._icon = L.DomUtil.create('span', 'dashicons dashicons-image-rotate', this._link);
		L.DomEvent
			.on( this._link, 'click', L.DomEvent.stopPropagation)
			.on( this._link, 'click', L.DomEvent.preventDefault)
			.on( this._link, 'click', this._onClick, this)
			.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

		return this._container;
	},
	onRemove:function() {
		L.DomEvent
			.off(this._link, 'click', L.DomEvent.stopPropagation )
			.off(this._link, 'click', L.DomEvent.preventDefault )
			.off(this._link, 'click', this._onClick, this )
			.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
	},
	_onClick: function() {
		// remove all layers ...
		this._map.eachLayer(function(layer) { layer.remove() } );
		// ... add default layers
		this._default_layers.forEach( layer => {
			L.tileLayer.provider( layer.provider ).addTo( this._map )
		} )
	}
})

class ControlTypeResetLayers extends ControlType {
	
	setupControl() {
		
		this.reset_control = new L.Control.ResetLayers({
			position: 'topright'
		}).addTo( this.map );

	}
	
	resetControl() {
		this.reset_control.remove()
	}
}


registerControlType( 'reset-layers', ControlTypeResetLayers )
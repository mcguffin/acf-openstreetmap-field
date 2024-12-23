import {L} from 'leaflet/no-conflict';

const AddLocationMarker = L.Control.extend({
	linkTitle: 'Add Marker',
	onAdd: function() {

		this._container = L.DomUtil.create('div',
			'leaflet-control-add-location-marker leaflet-bar leaflet-control');

		this._link       = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container);
		this._link.title = this.linkTitle;
		this._icon       = L.DomUtil.create('span', 'dashicons dashicons-location', this._link);
		L.DomEvent
			.on( this._link, 'click', L.DomEvent.stopPropagation)
			.on( this._link, 'click', L.DomEvent.preventDefault)
			.on( this._link, 'click', this.options.callback, this)
			.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

		return this._container;
	},
	onRemove: function() {
		L.DomEvent
			.off(this._link, 'click', L.DomEvent.stopPropagation )
			.off(this._link, 'click', L.DomEvent.preventDefault )
			.off(this._link, 'click', this.options.callback, this )
			.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
	},
})

L.control.addLocationMarker = function (options) {
	return new L.Control.AddLocationMarker(options);
};

export { AddLocationMarker }

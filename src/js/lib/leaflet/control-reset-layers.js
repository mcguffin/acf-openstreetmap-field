import {L} from 'leaflet/no-conflict';

const ResetLayers = L.Control.extend({
	onAdd:function() {

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
		this._map.eachLayer(function(layer) { layer.remove() } );
	}
});

L.control.ResetLayers = function (options) {
	return new L.Control.ResetLayers(options);
};

export { ResetLayers }

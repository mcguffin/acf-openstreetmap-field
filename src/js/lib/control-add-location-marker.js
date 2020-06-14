var clog=console.log;
console.log('here');
(function (factory, window) {
     // see https://github.com/Leaflet/Leaflet/blob/master/PLUGIN-GUIDE.md#module-loaders
     // for details on how to structure a leaflet plugin.

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);

    // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        if (typeof window !== 'undefined' && window.L) {
            module.exports = factory(L);
        } else {
            module.exports = factory(require('leaflet'));
        }
    }
console.log(window);
console.log(window.L);
console.log(factory);
    // attach your plugin to the global 'L' variable
    if (typeof window !== 'undefined' && window.L){

        window.L.Control.AddLocationMarker = factory(L);
    }
} (function (L) {
	console.log('factory');
	var AddLocationMarker = L.Control.extend({
		onAdd:function() {

			this._container = L.DomUtil.create('div',
				'leaflet-control-add-location-marker leaflet-bar leaflet-control');

			this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container);
			this._link.title = i18n.add_marker_at_location;
			this._icon = L.DomUtil.create('span', 'dashicons dashicons-location', this._link);
			L.DomEvent
				.on( this._link, 'click', L.DomEvent.stopPropagation)
				.on( this._link, 'click', L.DomEvent.preventDefault)
				.on( this._link, 'click', this.options.callback, this)
				.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

			return this._container;
		},
		onRemove:function() {
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

	return AddLocationMarker;

}, window));

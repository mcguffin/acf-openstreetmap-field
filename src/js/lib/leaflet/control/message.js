import { L } from 'maps';

L.Control.Message = L.Control.extend({
	options: {
		position: 'topleft',
		text: 'A notice',
		className: 'leaflet-control-message',
		tagName: 'div'
	},
	// initialize: function(options) {
	// 	L.Util.setOptions(this, options);
	// },
    onAdd:function() {
		
        this._container = L.DomUtil.create(
			this.options.tagName,
            this.options.className + ' leaflet-control'
		);

		this._container.textContent = this.options.text

        return this._container;
    },
    onRemove:function() {
    },
})

L.control.message = function (options) {
    return new L.Control.Message(options);
};
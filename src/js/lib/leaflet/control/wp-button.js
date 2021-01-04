import { L } from 'maps';

L.Control.WPButton = L.Control.extend({
	options: {
		position: 'topright',
		title: '',
		clickHandler: e => {},
		className: 'leaflet-control-button',
		dashicon: 'admin-site-alt3'
	},
	// initialize: function(options) {
	// 	L.Util.setOptions(this, options);
	// },
    onAdd:function() {
		
        this._container = L.DomUtil.create('div',
            this.options.className + ' leaflet-bar leaflet-control');

        this._link = L.DomUtil.create('a', 'acf-osm-tooltip leaflet-bar-part leaflet-bar-part-single', this._container );
		if ( !! this.options.title ) {
			this._link.title = this.options.title;
		}
        this._icon = L.DomUtil.create('span', 'dashicons dashicons-' + this.options.dashicon, this._link );
        L.DomEvent
            .on( this._link, 'click', L.DomEvent.stopPropagation )
            .on( this._link, 'click', L.DomEvent.preventDefault )
            .on( this._link, 'click', this.options.clickHandler )
            .on( this._link, 'dblclick', L.DomEvent.stopPropagation );

        return this._container;
    },
    onRemove:function() {
        L.DomEvent
            .off(this._link, 'click', L.DomEvent.stopPropagation )
            .off(this._link, 'click', L.DomEvent.preventDefault )
            .off(this._link, 'click', this.options.clickHandler )
            .off(this._link, 'dblclick', L.DomEvent.stopPropagation );
    },
})

L.control.wpButton = function (options) {
    return new L.Control.WPButton(options);
};
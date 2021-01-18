import { ControlType, registerControlType } from 'controls/control-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'
import { options as adminOptions, i18n } from 'pluginAdminOptions'
import { L } from 'maps';

L.Control.CopyShortcode = L.Control.extend({
	onAdd:function() {

		this._container = L.DomUtil.create('div',
			'leaflet-control-copy-shoertcode leaflet-bar leaflet-control');

		this._link = L.DomUtil.create('a', 'acf-osm-tooltip leaflet-bar-part leaflet-bar-part-single', this._container);
		this._link.title = i18n.copy_shortcode;
		this._icon = L.DomUtil.create('span', 'dashicons dashicons-shortcode', this._link);
		this._shortcode = L.DomUtil.create('input', 'screen-reader-text', this._link);
		L.DomEvent
			.on( this._link, 'click', L.DomEvent.stopPropagation)
			.on( this._link, 'click', L.DomEvent.preventDefault)
			.on( this._link, 'click', this.options.onClick, this)
			.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

		return this._container;
	},
	onRemove:function() {
		L.DomEvent
			.off(this._link, 'click', L.DomEvent.stopPropagation )
			.off(this._link, 'click', L.DomEvent.preventDefault )
			.off(this._link, 'click', this.options.onClick, this )
			.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
	},
	copyShortcode: function() {
		this._shortcode.select();
		this._shortcode.setSelectionRange(0,this._shortcode.value.length);
		document.execCommand("copy");
		this._link.title = i18n.copied_shortcode;
	},
	setShortcode: function(shortcode) {
		this._shortcode.value = shortcode
		this._link.title = i18n.copy_shortcode;
	}
})

class ControlTypeCopyShortcode extends ControlType {
	
	setupControl() {
		
		this.shortcode_control = new L.Control.CopyShortcode({
			position: 'bottomright',
			onClick: e => {
				this.cb( this )
				this.shortcode_control.copyShortcode()
			}
		}).addTo( this.map );

	}
	
	mutateMap(mapData) {

		const mapDataStr = btoa( JSON
				.stringify(mapData)
				.replace( /[\u007f-\uffff]/g, c => '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4) )
			)
		this.shortcode_control.setShortcode(`[leaflet height="400" map="${mapDataStr}"]` )
		return mapData;
	}
	
	resetControl() {
		this.shortcode_control.remove()
		
	}
}


registerControlType( 'shortcode', ControlTypeCopyShortcode )
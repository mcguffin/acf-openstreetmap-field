import L from 'leaflet/no-conflict';

const { _initControlPos, _clearControlPos } =  L.Map.prototype

L.Map.include({

	_initControlPos: function() {
		const ret   = _initControlPos.apply( this,arguments )
		const above = L.DomUtil.create('div', 'acf-osm-above leaflet-above' )
		const below = L.DomUtil.create('div', 'acf-osm-below leaflet-below' )

		this._container.before( above )
		this._container.after( below )
		this._controlCorners['above'] = above
		this._controlCorners['below'] = below

		return ret
	}
})

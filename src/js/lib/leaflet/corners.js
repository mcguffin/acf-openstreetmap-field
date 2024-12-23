import {L} from 'leaflet/no-conflict';

const { _initControlPos, _clearControlPos } =  L.Map.prototype

const addCorners = map => {
	const above = L.DomUtil.create('div', 'acf-osm-above leaflet-above' )
	const below = L.DomUtil.create('div', 'acf-osm-below leaflet-below' )

	map._container.before( above )
	map._container.after( below )
	map._controlCorners['above'] = above
	map._controlCorners['below'] = below
}


export { addCorners }

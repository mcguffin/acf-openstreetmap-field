import {L} from 'leaflet/no-conflict';

const { _initControlPos, _clearControlPos } =  L.Map.prototype

const addCorners = map => {
	const above = L.DomUtil.create('div', 'acf-osm-above leaflet-above' )
	const below = L.DomUtil.create('div', 'acf-osm-below leaflet-below' )


	map.on('resize', () => {
		const mapHeight = map._container.getBoundingClientRect().height
		above.style.setProperty( '--map-height', mapHeight )
		below.style.setProperty( '--map-height', mapHeight )
	})

	map._container.before( above )
	map._container.after( below )
	map._controlCorners['above'] = above
	map._controlCorners['below'] = below

};


export { addCorners }

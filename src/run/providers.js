const fs = require('fs');

console.log(process.cwd())

// fake leaflet
L = {
	TileLayer: {
		extend: function(o) {
			for ( var s in o )
				L.TileLayer[s] = o[s];
			return L.TileLayer;
		},
//		Provider:{}
	},
	tileLayer:{}
}

function leafletProviders(cb){
	require(process.cwd()+'/node_modules/leaflet-providers/leaflet-providers.js');
	let providers = L.TileLayer.Provider.providers;

	// add overlay property to maps and layers
	const isOverlay = ( name, opts ) => {
		if ( 'string' !== typeof opts && opts.opacity && opts.opacity < 1 ) {
			return true;
		}
		let overlayPattern = [
			'^(OpenWeatherMap|OpenSeaMap)',
			'OpenMapSurfer.(Hybrid|AdminBounds|ContourLines|Hillshade|ElementsAtRisk)',
			'HikeBike.HillShading',
			'Stamen.(Toner|Terrain)(Hybrid|Lines|Labels)',
			'TomTom.(Hybrid|Labels)',
			'Hydda.RoadsAndLabels',
			'^JusticeMap',
			'OpenPtMap',
			'OpenRailwayMap',
			'OpenFireMap',
			'SafeCast',
			'OnlyLabels',
			'HERE(v3?).trafficFlow',
			'HERE(v3?).mapLabels',
			'WaymarkedTrails'
		].join('|');

		return name.match( overlayPattern ) !== null;
	}

	// HEREv3 manual upgrade until https://github.com/leaflet-extras/leaflet-providers/pull/343 is released
	// L.TileLayer.Provider.providers.HEREv3 = JSON.parse(JSON.stringify(L.TileLayer.Provider.providers.HERE))
	// L.TileLayer.Provider.providers.HEREv3.url = "https://{s}.{base}.maps.ls.hereapi.com/maptile/2.1/{type}/{mapID}/{variant}/{z}/{x}/{y}/{size}/{format}?apiKey={apiKey}&lg={language}";
	// L.TileLayer.Provider.providers.HEREv3.options.apiKey = "<insert your apiKey here>";
	// delete( L.TileLayer.Provider.providers.HEREv3.options.app_code )
	// delete( L.TileLayer.Provider.providers.HEREv3.options.app_id )

	 // 52d2aca6-c3b6-4c59-b9de-5df4f4d056bd
	 
	 delete( L.TileLayer.Provider.providers.USGS ) // Remove, lots of 404s
	 
	 // missing default variants, will break JS
	 L.TileLayer.Provider.providers.JusticeMap.options.variant = 'income'
	 L.TileLayer.Provider.providers.WaymarkedTrails.options.variant = 'hiking'
	 L.TileLayer.Provider.providers.NASAGIBS.options.variant = 'MODIS_Terra_CorrectedReflectance_TrueColor'
	 L.TileLayer.Provider.providers.nlmaps.options.variant = 'brtachtergrondkaart'
	 
	 // delete seemingly broken stamen variants
	 delete( L.TileLayer.Provider.providers.Stamen.variants.TopOSMRelief);
	 delete( L.TileLayer.Provider.providers.Stamen.variants.TopOSMFeatures);


/*
	// add MAPBOX ids as variant. See https://www.mapbox.com/api-documentation/#maps
	let mapbox_variants = [
		'streets',
		'light',
		'dark',
		'satellite',
		'streets-satellite',
		'wheatpaste',
		'streets-basic',
		'comic',
		'outdoors',
		'run-bike-hike',
		'pencil',
		'pirates',
		'emerald',
		'high-contrast',
	];
	L.TileLayer.Provider.providers.MapBox.variants = {};
	mapbox_variants.forEach( variant => {
		var key;
		key = variant.replace(/^(.)|[\s-_\.]+(.)/g, function ($1) {
			return $1.toUpperCase()
		})
		key = key.replace( /\s\r\n\v\.-_/, '' );
		L.TileLayer.Provider.providers.MapBox.variants[ key ] = 'mapbox.'+variant;
	} )
	L.TileLayer.Provider.providers.MapBox.url = L.TileLayer.Provider.providers.MapBox.url.
		replace('{id}','{variant}');
	L.TileLayer.Provider.providers.MapBox.options.variant = 'mapbox.streets';

	// remove falsy configuration
	delete( L.TileLayer.Provider.providers.MapBox.options.id );
	// END mapbox
*/
	// add overlay property to maps and layers
	Object.keys(providers).map( key => {
		let data = providers[key];
		if ( isOverlay( key, data ) ) {
			data.isOverlay = true;
		} else if ( !! data.variants ) {
			Object.keys(data.variants).map( vkey => {
				let variant = data.variants[vkey];
				if ( 'string' === typeof variant ) {
					variant = {
						options: {
							variant: variant
						}
					}
				}
				if ( isOverlay( `${key}.${vkey}`, variant ) ) {
					variant.isOverlay = true;
				}
				data.variants[vkey] = variant
			});
		}
		// if ( data.options.opacity && data.options.opacity < 1 ) {
		// 	data.isOverlay = true;
		// } else if ( !! data.variants ) {
		// 	Object.keys(data.variants).map( vkey => {
		// 		let variant = data.variants[vkey];
		// 		if ( 'string' === typeof variant ) {
		// 			return;
		// 		}
		// 		if ( variant.options && variant.options.opacity && variant.options.opacity < 1 ) {
		// 			data.variants[vkey].isOverlay = true;
		// 		} else if ( `${key}.${vkey}`.match( overlayPattern ) !== null ) {
		// 			data.variants[vkey].isOverlay = true;
		// 		}
		// 	} )
		// } else if ( key.match( overlayPattern ) !== null ) {
		// 	data.isOverlay = true;
		// }
		providers[key] = data;
	} );
	return fs.writeFileSync( process.cwd()+'/etc/leaflet-providers.json', JSON.stringify( providers, null, '\t' ) );
}

leafletProviders();
import { i18n } from 'pluginAdminOptions';
import { init as mapsInit, L } from 'maps';
//import GeocoderControl from 'leaflet-control-geocoder/dist/Control.Geocoder.modern';
import 'leaflet-control-geocoder';


const parseTemplate = ( template, data = {} ) => {
	return template.replace(
		/\{(.+?)\}/g, 
		( match, p1 ) => !! data[ p1 ] ? data[ p1 ] : '' 
	)
}

const parseGeocodeResults = ( results, latlng ) => {
	let result

	if ( ! results.length ) {
		// generic result
		result = {
			name: `${latlng.lat}, ${latlng.lng}`,
			html: `${latlng.lat}, ${latlng.lng}`,
			bbox: null,
			center: latlng,
			properties: false
		}
	} else {
		result = results[0]
	}
	return result;
}


class Geocoder {
	constructor( map, cb ) {
		
		// 
		// const above = document.createElement('div'),
		// 	mapEl = map.getContainer()
		// above.classList.add('acf-osm-above')
		// 
		// mapEl.parentNode.insertBefore( above, mapEl )
		// 
		// // add an extra control panel region for our search
		// map._controlCorners['above'] = above;
		
		
		this.onMarkGeocode = e => {
			
			this.geocoderControl._clearResults();
			this.geocoderControl._input.value = '';

			/**
			 *	@var e.geocode {
			 *			name: String,
			 *			html: String,
			 *			bbox: L.latLngBounds,
			 *			center: L.latLng,
			 *			properties: { // geocoder result },
			 *		}
			 */

			cb( e.geocode )

		}

		this.geocoderControl = L.Control.geocoder({
			collapsed: false,
			position: 'outsidetop',
			placeholder: i18n.search,
			errorMessage: i18n.nothing_found,
			showResultIcons: true,
			suggestMinLength: 3,
			suggestTimeout: 250,
			queryMinLength: 3,
			defaultMarkGeocode: false,
			geocoder: L.Control.Geocoder.nominatim({
				htmlTemplate: function(result) {
					var parts = [],
						addr = _.defaults( result.address, {
							building:'',
							road:'',
							house_number:'',

							postcode:'',
							city:'',
							town:'',
							village:'',
							hamlet:'',

							state:'',
							country:'',
						} );
					
					parts.push( parseTemplate( i18n.address_format.street, addr ) );

					parts.push( parseTemplate( i18n.address_format.city, addr ) );

					parts.push( parseTemplate( i18n.address_format.country, addr ) );

					return parts
						.map( el => el.replace(/\s+/g,' ').trim() )
						.filter( el => el !== '' )
						.join(', ')
				}
			})
		})
		.on( 'markgeocode', this.onMarkGeocode )
		.addTo( map );

	}

	reverse( latlng, zoom, cb ) {
		this.geocoderControl.options.geocoder.reverse(
			latlng,
			zoom,
			function( results ) {
				/** 
				 *	@var results [
				 *		{
				 *			name: String,
				 *			html: String,
				 *			bbox: L.latLngBounds,
				 *			center: L.latLng,
				 *			properties: { // geocoder result  },
				 *		},
				 *		...
				 *	]
				 *
				 */
				cb( parseGeocodeResults( results, latlng ) )
			}
		);
	}
	
	remove() {
		this.geocoderControl.off( 'markgeocode', this.onMarkGeocode )
		this.geocoderControl.remove()
	}
}

module.exports = { Geocoder }
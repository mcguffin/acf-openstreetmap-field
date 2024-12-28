import $ from 'jquery';
import { L } from 'osm-map';
import { formToObject } from 'misc/formdata' ;
import { mapZoomLevel } from 'misc/geocode';
import { addCorners } from 'leaflet/corners';
import { ResetLayers } from 'leaflet/control-reset-layers';
import { GeocoderFactory } from 'media/views/geocoderFactory' ;


let currentLayer = false,
	currentOverlay = false;

const { options, geocoders } = acf_osm_settings;
const { i18n } = acf_osm_admin
const { providers } = acf_osm;

const initMap = {
	providers: map => {
		const isOverlay = provider_key => {
			const parts = provider_key.split('.')
			let config = providers[parts.shift()]

			if ( config.isOverlay ) {
				return true;
			}
			if ( parts.length ) {
				config = config.variants[parts.shift()];
			}
			return !! config.isOverlay;
		}

		const addLayer = provider_key => {

			const layerConfig = options.layer_config[ provider_key.split('.')[0] ] || { options: {} };
			const layer       = L.tileLayer.provider( provider_key, layerConfig.options );

			layer.provider_key = provider_key;

			if ( isOverlay( provider_key ) ) {

				if ( currentOverlay ) {
					currentOverlay.remove();

					if ( currentOverlay.provider_key === provider_key ) {
						currentOverlay = false;
						return;
					}
				}
				currentOverlay = layer;
				currentOverlay.addTo( map );
			} else {
				if ( currentLayer ) {
					map.eachLayer(function(layer) { layer.remove() } );
					currentOverlay = false;
					//currentLayer.remove();
				}
				currentLayer = layer;

				currentLayer.addTo( map );

				if ( currentOverlay ) {
					currentOverlay.remove();
					currentOverlay.addTo( map );
				}
			}
		};
		map.on('layeradd', e => {

			let currentZoom, newZoom;

			const { layer } = e

			if ( ! map.hasLayer(layer) ) {
				return;
			}

			if (!!layer.options.bounds) {
				map.fitBounds( L.latLngBounds(layer.options.bounds), {
					paddingTopLeft: [0, 0],
					paddingBottomRight: [0, 0]
				});
			}

			// set zoom to current restrictions
			currentZoom = map.getZoom()
			newZoom = Math.max(
				layer.options.minZoom,
				Math.min( currentZoom, layer.options.maxZoom )
			);

			( currentZoom !== newZoom ) && map.setZoom( newZoom );
		});

		new ResetLayers({
			position: 'topright'
		}).addTo( map );

		$(document)
			.on('click','.acf-osm-settings [data-layer]',function(e){
				e.preventDefault();
				addLayer( $(this).data('layer') );
			})
			.on('click','.acf-osm-settings [data-action="change-token"]',function(e){
				e.preventDefault();
				const btn = e.target
				const div = document.createElement('div')
				div.innerHTML = e.target.nextElementSibling.innerHTML
				Array.from(div.childNodes).map( el => {
					btn.closest('label').append(el)
				})
			})
			.on('click','.acf-osm-settings [data-action="cancel-token"]',function(e){
				const btn = e.target
				const label = btn.closest('label')
				while ( ! label.querySelector('template:last-child') && label.childNodes.length ) {
					label.removeChild(label.lastChild)
				}
			})
			.on('change','.osm-disable[type="checkbox"]',function(e){
				$(this).closest('.acf-osm-setting').toggleClass('disabled',$(this).prop('checked'))
			})

	},
	geocoders: map => {
		let currentGeocoder
		addCorners(map)

		const output = document.querySelector('.acf-osm-geocode-response')

		map.on('click', e => {

			output.innerHTML = ''

			// reverse geocode
			const zoom = 'auto' === currentGeocoder.options.scale
					? mapZoomLevel( map.getZoom() )
					: parseInt( currentGeocoder.options.scale );

			currentGeocoder.options.geocoder.reverse(
				e.latlng,
				map.options.crs.scale( zoom ),
				/**
				 *	@param array results
				 */
				geocode => {
					output.innerHTML = JSON.stringify(geocode, null, 2)
				}
			);

		})

		const updateGeocoder = () => {

			output.innerHTML = ''

			!! currentGeocoder && currentGeocoder.remove()

			const { acf_osm_geocoder } = formToObject(document.querySelector('form'))
			const { engine } = acf_osm_geocoder
			const geocoder_options = Object.assign( { // hard coded defaults
					collapsed: false,
					position: 'above',
					placeholder: i18n.search,
					errorMessage: i18n.nothing_found,
					showResultIcons: true,
					suggestMinLength: 3,
					suggestTimeout: 250,
					queryMinLength: 3,
					defaultMarkGeocode: false
				},
				acf_osm_settings.geocoders[engine], // default settings
				acf_osm_geocoder, // form settings
				acf_osm_geocoder[engine]??{} // geocoder form settings
			)

			geocoder_options.geocoder = GeocoderFactory.createGeocoder( {
				geocoder_name: engine,
				geocoder_options
			} );
			currentGeocoder = L.Control.geocoder( geocoder_options )
				.on( 'markgeocode', e => {
					map.setView(e.geocode.center)
					map.fitBounds(e.geocode.bbox)
					output.innerHTML = JSON.stringify(e.geocode,null,2)
				})
				.addTo( map )
		}

		$('.acf-osm-geocoder-settings .form-table').on('change', e => {
			updateGeocoder()
		})
		updateGeocoder()

	}
}


$(document).on('acf-osm-map-init',function(e){
	const map  = e.detail.map
	const test = map._container.getAttribute('data-test')
	!!initMap[test] && initMap[test]( map )

}).on('change','[name="acf_osm_view"]', e => {
	// re-render maps on tab change
	document.querySelectorAll( '[data-map="leaflet"]' ).forEach( el => {
		if ( el.getBoundingClientRect().width > 0 ) {
			el.dispatchEvent( new CustomEvent( 'acf-osm-show', {
				detail: { L: L }
			} ) );
		}
	} )
})

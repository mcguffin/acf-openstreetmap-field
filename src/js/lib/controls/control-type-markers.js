import { ControlType, registerControlType } from 'controls/control-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'
import { options as adminOptions, i18n } from 'pluginAdminOptions';
import { L } from 'maps';
//import { getMarkerEntry } from 'views/marker-entry';
import { Geocoder } from 'misc/geocoder';

import 'leaflet/control/wp-button';
import 'leaflet/control/marker-list';
import 'leaflet/control/message';

/*
O Lord, I created a Monster!
*/
class ControlTypeMarkers extends ControlType {

	#holdTimeout = 750
	#holdWaitTo = false
	#holdWaitToPointer = {}


	get markers() {
		return Array.from(
			this._markerList._container.querySelectorAll('.leaflet-marker-entry')
		).map( node => node.getValue() )
	}

	get value() {
		// should return markers
		return this.markers
	}
	
	dblClickHandler(e) {

		L.DomEvent.preventDefault(e);
		L.DomEvent.stopPropagation(e);

		this.addOrSetMarker({
			...e.latlng,
			label:'New Marker',
			default_label:'New Marker',
		})
	}
	holdTouchDownHandler(e) {
		if ( e.touches.length !== 1 ) {
			return;
		}
		this.#holdWaitTo = setTimeout(() => {

			let cp = this.map.mouseEventToContainerPoint(e.touches[0]),
				lp = this.map.containerPointToLayerPoint(cp)

			self.addMarkerByLatLng( self.map.layerPointToLatLng(lp) )
			this.addOrSetMarker({
				...this.map.layerPointToLatLng(lp),
				label:'New Marker',
				default_label:'New Marker',
			})

			this.#holdWaitTo = false;
		}, this.#holdTimeout );
	}
	holdTouchUpHandler(e) {
		!! this.#holdWaitTo && clearTimeout( this.#holdWaitTo );
	}
	holdPointerDownHandler(e) {
		this.#holdWaitToPointer[ 'p'+e.pointerId ] = setTimeout(() =>{
			let cp = this.map.mouseEventToContainerPoint(e),
				lp = this.map.containerPointToLayerPoint(cp)

			this.addOrSetMarker({
				...this.map.layerPointToLatLng(lp),
				label:'New Marker',
				default_label:'New Marker',
			})
			this.#holdWaitToPointer[ 'p'+e.pointerId ] = false;
		}, this.#holdTimeout );
	}
	holdPointerUpHandler(e) {
		!! this.#holdWaitToPointer[ 'p'+e.pointerId ] && clearTimeout( this.#holdWaitToPointer[ 'p'+e.pointerId ] );
	}
	
	mutateMap( mapData ) {

		return Object.assign( mapData, {
			layers: [].concat(
				mapData.layers.filter( layer => 'markers' !== layer.type ),
				[ { type: 'markers', config: this.value } ]
			)
		} )
	}

	setupControl() {

		// this.markerList = this.map.getContainer().parentNode.querySelector('.osm-markers')

		// setup geocoder
		this.geocoder = new Geocoder( this.map, geocode => {
			// add marker or set only marker position
			this.addMarker( {
				lat: geocode.center.lat,
				lng: geocode.center.lng,
				label: geocode.html,
				default_label: geocode.html,
				data: geocode.properties
			}, false )
			
			this.map.panTo(geocode.center)
		} )

		// dbltap is not firing on mobile
		if ( L.Browser.touch && L.Browser.mobile ) {
			if ( L.Browser.pointer ) {
				L.DomEvent
					.on( this.map.getContainer(),'pointerdown',this.holdPointerDownHandler, this )
					.on( this.map.getContainer(), 'pointerup pointermove', this.holdPointerUpHandler, this );
			} else {
				L.DomEvent
					.on( this.map.getContainer(),'touchstart', this.holdTouchDownHandler, this )
					.on( this.map.getContainer(), 'touchend touchmove', this.holdTouchUpHandler, this );
			}

			this.markerInstructions = L.control.message({
				position: 'outsidebottom',
				text: `${i18n.tap_hold_to_add_marker} ${i18n.drag_marker_to_move}`,
				className: 'description',
				tagName: 'p'
			});
		} else {
			this.map
				.on('dblclick', this.dblClickHandler, this )
				.doubleClickZoom.disable();

			this.markerInstructions = L.control.message({
				position: 'outsidebottom',
				text: `${i18n.dbl_click_to_add_marker} ${i18n.drag_marker_to_move}`,
				className: 'description',
				tagName: 'p'
			});
		}

		/*
		UI elements
		 - Marker List
		 - Geocoder
		*/
		this.addOrSetMarker = ( markerData, doGeocode = true ) => {
			const markers = this.markers
			if ( false === this.config.max_markers || markers.length < this.config.max_markers ) {
				return this.addMarker( markerData, doGeocode )
			}
			if ( 1 === this.config.max_markers && markers.length === 1 ) {
				return this.setMarker( markerData )
			}
		}
		this.setMarker = ( markerData, doGeocode = true ) => {
//			this.markerList.querySelector('.osm-marker').setValue(markerData)

			let marker = this._markerList._layerGroup.getLayers()[0]
			marker._markerEntry.setValue(markerData)
			marker
				.setLatLng({ lat: markerData.lat, lng: markerData.lng })
				.fireEvent('moveend')

		}
		// add marker function
		this.addMarker = ( markerData, doGeocode = true, pling = true ) => {
			const icon = new L.DivIcon({
				html: pling 
					? '<span class="pling"></span>' 
					: '',
				className:'osm-marker-icon'
			})
			const marker = L.marker( { lat: markerData.lat, lng: markerData.lng }, {
					// title: markerData.label,
					icon: icon,
					draggable: true,
					rawData: markerData
				}),
//				markerEntry = getMarkerEntry( markerData, marker ),
				reverseGeocodeCb = geocode => {
					// update marker entry
					if ( marker._markerEntry.getValue('label') === marker._markerEntry.getValue('default_label') ) {
						marker._markerEntry.setValue( 'label', geocode.html )
					}
					marker._markerEntry.setValue( 'default_label', geocode.html )
					marker._markerEntry.setValue( 'data', geocode.properties )

					marker.getTooltip().setContent( marker._markerEntry.getValue( 'label' ) )

					this.cb( this )
				}
				;
			marker
				.bindTooltip( markerData.label )
				.on( 'add', e => {
					if ( doGeocode ) {
						this.geocoder.reverse( marker.getLatLng(), this.map.getZoom(), reverseGeocodeCb )						
					} else {
						this.cb( this )
					}

				})
				.on( 'remove', e => {
					this.cb( this )
				} )
				.on( 'moveend', e => {
					const latlng = marker.getLatLng()
					marker._markerEntry.setValue( 'lat', latlng.lat )
					marker._markerEntry.setValue( 'lng', latlng.lng )

					// update geocode!
					this.geocoder.reverse( marker.getLatLng(), this.map.getZoom(), reverseGeocodeCb )
				} )
				.on('click', e => {
					marker.remove()
				});

			marker.addTo(this.map)

			return marker
		}
		
		this._markerList = L.control.markerList({
			position: 'outsidebottom'
		}).addTo(this.map);

		this.markerInstructions.addTo(this.map)

		this.fitBoundsControl = L.control.wpButton({
			position: 'bottomright',
			dashicon: 'editor-expand',
			className: 'leaflet-control-fit-bounds',
			title: i18n.fit_markers_in_view,
			clickHandler: e => {
				const bounds = L.latLngBounds();
				if ( this.markers.length === 0 ) {
					return;
				}
				this.markers.forEach( marker => {
					bounds.extend( L.latLng(marker.lat,marker.lng ) )
				});
				this.map.fitBounds( bounds );
			}
		}).addTo(this.map);

		let currentLocation = false

		this.addLocatedControl = L.control.wpButton({
			position: 'bottomleft',
			dashicon: 'location',
			className: 'leaflet-control-add-located',
			title: i18n.add_marker_at_location,
			clickHandler: e => {
				this.addOrSetMarker( currentLocation, true, true )
			}
		}).addTo(this.map);
		
		this.onLocationFound = e => {
			// show addMarkerButton
			currentLocation = e.latlng
		}
		this.onLocationError = e => {
			// add 
			if ( e.code === 1 ) {
				currentLocation = false				
			}
		}

		this.onCreateMarkers = e => {
			e.preventDefault()

			// add markers
			e.detail.mapData.forEach( markerData => {
				// add marker list entry
				this.addMarker( markerData, false, false )
			} )

		}

		this.map.on('locationfound', this.onLocationFound )
		this.map.on('locationerror', this.onLocationError )


		this.map.getContainer().addEventListener('acf-osm-map-create-markers', this.onCreateMarkers )

	}
	
	
	resetControl() {

		if ( L.Browser.touch && L.Browser.mobile ) {
			if ( L.Browser.pointer ) {
				L.DomEvent
					.off( this.map.getContainer(),'pointerdown',this.holdPointerDownHandler, this )
					.off( this.map.getContainer(), 'pointerup pointermove', this.holdPointerUpHandler, this );
			} else {
				L.DomEvent
					.off( this.map.getContainer(),'touchstart', this.holdTouchDownHandler, this )
					.off( this.map.getContainer(), 'touchend touchmove', this.holdTouchUpHandler, this );
			}
		} else {
			this.map.off('dblclick', this.dblClickHandler, this )
		}
		this.markerInstructions.remove()
			
		//this.layer.remove()
		this.fitBoundsControl.remove()
		this.addLocatedControl.remove()


		this.map.off('locationfound', this.onLocationFound )
		this.map.off('locationerror', this.onLocationError )

		this.map.getContainer().removeEventListener('acf-osm-map-create-markers', this.onCreateMarkers )
		
		
	}

}

registerControlType( 'markers', ControlTypeMarkers )
import $ from 'jquery';
import {L} from 'osm-map';

import {AddLocationMarker} from 'leaflet/control-add-location-marker';
import {FitBounds} from 'leaflet/control-fit-bounds';
import {Provider} from 'leaflet/tile-layer-provider';

import { addCorners } from 'leaflet/corners';

import { MarkerData, MapData } from 'media/models';
import { MarkerEntry } from 'media/views/marker-entry';
import { uniqid } from 'misc/uniquid';
import { mapZoomLevel } from 'misc/geocode';

import {GeocoderFactory} from 'media/views/geocoderFactory' ;

const { options, i18n } = acf_osm_admin
const instances = []

class MapInput extends Backbone.View {

	static L = L

	static getByElement( mapDiv ) {
		return instances.find( inst => inst.el === mapDiv )
	}

	get $value() {
		return this.$el.siblings('input.osm-json:first');
	}

	get $markers() {
		return this.$el.siblings('.osm-markers:first');
	}

	get mapData() {
		const data = JSON.parse( this.$value.val() );
		data.lat = data.lat || this.$el.attr('data-map-lat');
		data.lng = data.lng || this.$el.attr('data-map-lng');
		data.zoom = data.zoom || this.$el.attr('data-map-zoom');
		return data;
	}

	get markers() {
		return this.model.get('markers');
	}

	get countMarkers() {
		return this.markers.length;
	}

	get hasMarkers() {
		return this.countMarkers > 0
	}

	get maxMarkers() {
		return this.config.max_markers === false
			? Infinity
			: this.config.max_markers
	}

	get canAddMarker() {
		console.log('cnAddMarker',this.countMarkers , this.maxMarkers)
		return this.countMarkers < this.maxMarkers
	}

	constructor(conf) {
		super(conf)
		instances.push(this)
		this.L = L
	}
	destructor() {
		const idx = instances.indexOf(this)
		if ( idx > -1 ) {
			instances.splice(idx,1)
		}
	}

	preventDefault( e ) {
		e.preventDefault();
	}

	initialize(conf) {

		super.initialize(conf)

		addCorners(conf.map)
		this.config      = this.$el.data().editorConfig;
		this.map         = conf.map;
		// this.field       = conf.field;
		this.model       = new MapData(this.mapData);
		this.plingMarker = false;

		this.init_locator_add();

		this.init_locator();

		// !! only if a) in editor && b) markers allowed !!
		if ( this.config.max_markers !== 0 ) {
			this.init_fit_bounds();
		}

		if ( this.config.allow_providers ) {
			// prevent default layer creation
			this.el.addEventListener( 'acf-osm-map-create-layers', e => e.preventDefault() )

			this.initLayers();
		}

		this.el.addEventListener( 'acf-osm-map-create-markers', e => e.preventDefault() )

		// reset markers in case field was duplicated with a row
		this.$markers.html('')
		this.initMarkers();

		this.listenTo( this.model, 'change', this.updateValue );
		this.listenTo( this.markers, 'add', this.initMarker );
		this.listenTo( this.markers, 'add', this.updateValue );
		this.listenTo( this.markers, 'remove', this.updateValue );
		this.listenTo( this.markers, 'change', this.updateValue );
		//this.listenTo( this.model, 'change:layers', console.trace );

		// update on map view change
		this.map.on('zoomend', () => {
			this.model.set('zoom',this.map.getZoom());
		});
		this.map.on('moveend', () => {
			var latlng = this.map.getCenter();

			this.model.set('lat',latlng.lat );
			this.model.set('lng',latlng.lng );
		});

		//
		const attributionControl = this.map.attributionControl
		attributionControl.remove()
		attributionControl.options.position = 'below'
		attributionControl.addTo( this.map )

		this.update_visible();

		this.update_map();

		// kb navigation might interfere with other kb listeners
		this.map.keyboard.disable();

		this.el.dispatchEvent( new CustomEvent( 'osm-editor/initialized', { detail: {  view: this } } ), { bubbles: true } )

		return this;
	}

	init_fit_bounds() {
		// 2do: externalize L.Control.FitBoundsControl
		const cb = () => {
			if ( this.countMarkers === 0 ) {
				return;
			}
			const llb = L.latLngBounds();
			this.markers.forEach( marker => {
				llb.extend(L.latLng(marker.get('lat'),marker.get('lng')))
			});
			this.map.fitBounds(llb);
		}
		this.fitBoundsControl = new FitBounds({
			position: 'bottomright',
			callback: () => cb()
		}).addTo(this.map);
	}

	init_locator_add() {

		if ( this.config.max_markers === false || this.config.max_markers > 0 ) {
			this.locatorAdd = new AddLocationMarker({
				position: 'bottomleft',
				linkTitle: i18n.add_marker_at_location,
				callback: () => {
					if ( this.canAddMarker ) {
						this.currentLocation && this.addMarkerByLatLng( this.currentLocation );
					}
					this.locator.stop();
				}
			}).addTo(this.map);
		}
	}

	init_locator() {
		this.currentLocation = false;

		this.locator = L.control.locate({
			position: 'bottomleft',
			icon: 'dashicons dashicons-location-alt',
			iconLoading: 'spinner is-active',
			flyTo: true,
			strings: {
				title: i18n.my_location
			},
			onLocationError: err => {}
		}).addTo(this.map);


		this.map.on('locationfound', e => {

			this.currentLocation = e.latlng;

			setTimeout(() => {
				if ( this.config.max_markers === false || this.config.max_markers > 0 ) {
					this.locator.stopFollowing();
				} else {
					this.locator.stop();
				}
				$(this.locator._icon).removeClass('dashicons-warning');
				//this.locatorAdd.addTo(this.map)
			},1);
		})
		this.map.on('locationerror',e => {
			this.currentLocation = false;
			this.locator.stop();
			setTimeout(() => {
				$(this.locator._icon).addClass('dashicons-warning');
			},1);
		})
	}

	updateValue() {
		this.$value.val( JSON.stringify( this.model.toJSON() ) ).trigger('change');
		//this.$el.trigger('change')
		this.updateMarkerState();
	}

	updateMarkerState() {
		this.$el.attr('data-has-markers', this.hasMarkers.toString() );
		this.$el.attr('data-can-add-marker', this.canAddMarker.toString() );
	}

	/**
	 *	Init marker from Model
	 *
	 *	@param Backbone.Model model
	 *	@param Backbone.Collection collection
	 */
	initMarker( model ) {

		// add marker to map
		/** @var leaflet marker */
		const marker = L.marker( { lat: model.get('lat'), lng: model.get('lng') }, {
				title: model.get('label'),
				icon: this.icon,
				draggable: true
			})
			.bindTooltip( model.get('label') );

		if ( ! model.get('uuid') ) {
			model.set( 'uuid', uniqid('marker_') )
		}

		/** @var Backbone.View */
		const entry = new MarkerEntry({
			controller: this,
			marker: marker,
			model: model
		});

		this.map.once('layeradd',e => {
			// changes on model affect map
			marker
				.on('click', e => {
					model.destroy();
				})
				.on('dragend', e => {
					// update model lnglat on drag
					const latlng = marker.getLatLng();
					model.set( 'lat', latlng.lat );
					model.set( 'lng', latlng.lng );
					this.reverseGeocode( model );
					// geocode, get label, set model label...
				})

			entry.$el.appendTo( this.$markers );
		});

		model.on( 'destroy', () => {
			this.el.dispatchEvent( new CustomEvent( 'osm-editor/destroy-marker', { detail: {  model } } ), { bubbles: true } )
			marker.remove();
		});

		const changedlatLng = e => {
			this.el.dispatchEvent( new CustomEvent( 'osm-editor/update-marker-latlng', { detail: { model } } ), { bubbles: true } )
		}
		this.listenTo( model, 'change:lat', changedlatLng );
		this.listenTo( model, 'change:lng', changedlatLng );

		marker.addTo( this.map );

		if ( this.plingMarker ) {
			entry.pling();
		}
	}

	initMarkers(){

		this.initGeocode();

		// no markers allowed!
		if ( this.config.max_markers === 0 ) {
			return;
		}

		this.icon = new L.DivIcon({
			html: '',
			className: 'osm-marker-icon'
		});

		this.markers.forEach( model => {
			this.initMarker( model );
		} );

		// adding marker pointer action
		if ( L.Browser.touch && L.Browser.mobile ) {
			this._add_marker_on_hold();
		} else {
			this._add_marker_on_dblclick();
		}

		this.updateMarkerState();
	}

	_add_marker_on_dblclick() {

		this.map.on('dblclick', e => {
			const { latlng } = e;

			L.DomEvent.preventDefault(e);
			L.DomEvent.stopPropagation(e);

			this.addMarkerByLatLng( latlng );
		})
		.doubleClickZoom.disable();
		this.$el.addClass('add-marker-on-dblclick')
	}

	_add_marker_on_hold() {

		const _hold_timeout = 750
		const _hold_wait_to = {}
		const container     = this.map.getContainer()

		// TODO use https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture

		// stop waiting for tap-hold
		const pointerend  = e => {
			if ( ! _hold_wait_to[ 'p'+e.pointerId ] ) {
				return
			}
			const { x, y } = _hold_wait_to[ 'p'+e.pointerId ].coord
			const delta    = Math.sqrt( Math.pow( e.clientX - x, 2 ) + Math.pow( e.clientY - y, 2 ) )
			if ( delta < 1 ) {
				return
			}

			clearTimeout( _hold_wait_to[ 'p'+e.pointerId ].to )
			container.removeEventListener( 'pointerup', pointerend )
			container.removeEventListener( 'pointermove', pointerend )
			delete _hold_wait_to[ 'p'+e.pointerId ]
		}
		container.addEventListener( 'pointerdown',e => {

			// wait for tap-hold
			_hold_wait_to[ 'p'+e.pointerId ] = {
				to: setTimeout(() => {
					var cp = this.map.mouseEventToContainerPoint(e);
					var lp = this.map.containerPointToLayerPoint(cp)

					this.addMarkerByLatLng( this.map.layerPointToLatLng(lp) )

					_hold_wait_to[ 'p'+e.pointerId ] = false;
				}, _hold_timeout ),
				coord: {
					x: e.clientX,
					y: e.clientY,
				},
			}

			container.addEventListener('pointerup', pointerend, { once: false, passive: false } )
			container.addEventListener('pointermove', pointerend, { once: false, passive: false } )

		}, { capture: true, passive: false } )

		this.$el.addClass('add-marker-on-taphold')
	}

	addMarkerByLatLng(latlng) {
		// no more markers
		console.log('can',this.canAddMarker)
		if ( ! this.canAddMarker ) {
			return;
		}
		const model = new MarkerData({
			label: '',
			default_label: '',
			lat: latlng.lat,
			lng: latlng.lng,
			geocode: [],
		});

		this.plingMarker = true;
		const marker = this.markers.add( model ); // will call initMarker > will add marker to map
		this.reverseGeocode( model );

		this.el.dispatchEvent( new CustomEvent( 'osm-editor/create-marker', { detail: { model } } ), { bubbles: true } )
	}

	/**
	 *	Geocoding
	 *
	 *	@on map.layeradd, layer.dragend
	 */
	initGeocode() {

		let $above = this.$el.prev();
		if ( ! $above.is( '.acf-osm-above' ) ) {
			$above = $('<div class="acf-osm-above"></div>').insertBefore( this.$el );
		} else {
			$above.html('');
		}
		// add an extra control panel region for out search
		this.map._controlCorners['above'] = $above.get(0);

		const geocoderEngine = GeocoderFactory.createGeocoder( options );

		const geocoder_options = Object.assign({
			collapsed: false,
			position: 'above',
			placeholder: i18n.search,
			errorMessage: i18n.nothing_found,
			showResultIcons:true,
			suggestMinLength:3,
			suggestTimeout:250,
			queryMinLength:3,
			defaultMarkGeocode:false,
			// geocodingQueryParams: {'accept-language':'de_DE'},
			//geocoder: L.Control.Geocoder.nominatim( nominatim_options )
			geocoder: geocoderEngine
		}, options.geocoder );

		this.geocoder = L.Control.geocoder( geocoder_options )
			.on( 'markgeocode', e => {

				// search result click
				let model,
					previousGeocode = false;

				const latlng =  e.geocode.center,
					label = this.parseGeocodeResult( [ e.geocode ], latlng ),
					marker_data = {
						label: label,
						default_label: label,
						lat: latlng.lat,
						lng: latlng.lng,
						geocode: [ e.geocode ],
					}

				// getting rid of the modal – #35
				this.geocoder._clearResults();
				this.geocoder._input.value = '';

				// no markers - just adapt map view
				if ( this.config.max_markers === 0 ) {

					return this.map.fitBounds( e.geocode.bbox );

				}

				if ( this.canAddMarker ) {
					// infinite markers or markers still in range
					model = this.markers.add( marker_data );
					this.el.dispatchEvent( new CustomEvent( 'osm-editor/create-marker', { detail: {  model } } ), { bubbles: true } )

				} else if ( this.maxMarkers === 1 ) {
					// one marker only
					model = this.markers.at(0)
					previousGeocode = model.get('geocode')
					model.set( marker_data );
				}

				this.map.setView( latlng, this.map.getZoom() ); // keep zoom, might be confusing else

				this.el.dispatchEvent( new CustomEvent( 'osm-editor/marker-geocode-result', { detail: {  model, geocode: e.geocode, previousGeocode } } ), { bubbles: true } )

			})
			.addTo( this.map );

		// Issue #87 - <button>This is not a button</button>
		L.DomEvent.on(
			this.geocoder.getContainer().querySelector('.leaflet-control-geocoder-icon'),
			'click',
			function() {
				if (this._selection) {
					var index = parseInt(this._selection.getAttribute('data-result-index'), 10);

					this._geocodeResultSelected(this._results[index]);

					this._clearResults();
				} else {
					this._geocode();
				}
			},
			this.geocoder
		)
	}

	reverseGeocode( model ) {

		const latlng = { lat: model.get('lat'), lng: model.get('lng') },
			zoom = 'auto' === this.geocoder.options.scale
				? mapZoomLevel( this.map.getZoom() )
				: parseInt( this.geocoder.options.scale );

		this.geocoder.options.geocoder.reverse( latlng, this.map.options.crs.scale( zoom ) ).then(
			geocode => {
				const previousGeocode = model.get('geocode' )

				model.set('geocode', geocode );
				model.set('default_label', this.parseGeocodeResult( geocode, latlng ) );

				this.el.dispatchEvent( new CustomEvent( 'osm-editor/marker-geocode-result', { detail: {  model, geocode, previousGeocode }} ), { bubbles: true } )
			}
		);
	}

	parseGeocodeResult( results, latlng ) {

console.debug('parseGeocodeResult', results);

		var label = false;

		if ( ! results.length ) {
			label = latlng.lat + ', ' + latlng.lng;
		} else {
			$.each( results, ( i, result ) => {
				if( result.html )
					// `htmlTemplate` method and `html` property are available.
					label = result.html ;
				else if( result.name )
					// Default to `name` property
					label = result.name ;
				else
					label = 'Failed to decode geocoder result 😕';
			});
		}
		// trim
		return label;
	}

	getDefaultProviders() {

	}

	/**
	 *	Layers
	 */
	initLayers() {

		const selectedLayers = this.model.get('layers')
		const allLayers      = (this.config.restrict_providers || Object.values(acf_osm_admin.options.leaflet_layers))
			.map( providerKey => L.tileLayer.provider( providerKey ) )

		const baseLayers     = Object.fromEntries( allLayers.filter( l => ! l.overlay ).map( l => [ l.providerKey, l ] ) )
		const overlays       = Object.fromEntries( allLayers.filter( l => l.overlay ).map( l => [ l.providerKey, l ] ) )

		allLayers
			.filter( layer => selectedLayers.includes( layer.providerKey ) )
			.sort( (a,b) => a.overlay )
			.forEach( layer => layer.addTo( this.map ) )

		// update model
		this.map.on( 'baselayerchange layeradd layerremove', e => {

			if ( ! e.layer.providerKey ) {
				return;
			}
			var layers = [];

			this.map.eachLayer( layer => {
				if ( ! layer.providerKey ) {
					return;
				}

				if ( layer.overlay ) {
					layers.push( layer.providerKey )
				} else {
					layers.unshift( layer.providerKey )
				}
			});
			this.model.set( 'layers', layers );
		} );

		this.layersControl = L.control.layers( baseLayers, overlays, {
			collapsed: true,
			hideSingleBase: true,
		}).addTo(this.map);
	}

	layer_is_overlay( key, layer ) {

		if ( layer.options.opacity && layer.options.opacity < 1 ) {
			return true;
		}

		var patterns = [
			'^(OpenWeatherMap|OpenSeaMap)',
			'OpenMapSurfer.(Hybrid|AdminBounds|ContourLines|Hillshade|ElementsAtRisk)',
			'HikeBike.HillShading',
			'^WaymarkedTrails',
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
			'HERE(v3?).mapLabels'
		].join('|');
		return key.match('(' + patterns + ')') !== null;
	}

	resetLayers() {
		// remove all map layers
		this.map.eachLayer( layer => {
			if ( layer.constructor === L.TileLayer.Provider ) {
				layer.remove();
			}
		})
		this.map.off('baselayerchange layeradd layerremove')
		// remove layer control
		!! this.layersControl && this.layersControl.remove()
	}

	update_visible() {
		// no change
		if ( this.visible === this.$el.is(':visible') ) {
			return this;
		}

		this.visible = this.$el.is(':visible');

		if ( this.visible ) {
			this.map.invalidateSize();
		}
		return this;
	}

	update_map() {
		var latlng = { lat: this.model.get('lat'), lng: this.model.get('lng') }
		this.map.setView(
			latlng,
			this.model.get('zoom')
		);
	}
}

document.addEventListener( 'acf-osm-map-init', e => {
	// setup map input element
	if ( e.target.matches('[data-editor-config]') ) {
		const { map } = e.detail;
		new MapInput( { el: e.target, map: map } );
	}
} )

export {MapInput}

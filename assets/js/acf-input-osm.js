(function( $, arg, exports ){
	var options = arg.options,
		i18n = arg.i18n,
		result_tpl = '<div tabindex="<%= data.i %>" class="osm-result">'
			+ '<%= data.result_text %>'
			+ '<br /><small><%= data.properties.osm_value %></small>'
			+ '</div>';

	var osm = exports.osm = {
	};

	var locatorAddControl = null;

	var fixedFloatGetter = function( prop, fix ) {
		return function() {
			return parseFloat( this.attributes[ prop ] );
		}
	}
	var fixedFloatSetter = function( prop, fix ) {
		return function(value) {
			return parseFloat(parseFloat(value).toFixed(fix) );
		}
	}
	var intGetter = function(prop) {
		return function() {
			return parseInt( this.attributes[ prop ] );
		}
	}
	var intSetter = function(prop) {
		return function(value) {
			return parseInt( value );
		}
	}

	var GSModel = Backbone.Model.extend({

		get: function(attr) {
			// Call the getter if available
			if (_.isFunction(this.getters[attr])) {
				return this.getters[attr].call(this);
			}

			return Backbone.Model.prototype.get.call(this, attr);
		},

		set: function(key, value, options) {
			var attrs, attr;

			// Normalize the key-value into an object
			if (_.isObject(key) || key == null) {
				attrs = key;
				options = value;
			} else {
				attrs = {};
				attrs[key] = value;
			}

			// always pass an options hash around. This allows modifying
			// the options inside the setter
			options = options || {};

			// Go over all the set attributes and call the setter if available
			for (attr in attrs) {
				if (_.isFunction(this.setters[attr])) {
					attrs[attr] = this.setters[attr].call(this, attrs[attr], options);
				}
			}

			return Backbone.Model.prototype.set.call(this, attrs, options);
		},

		getters: {},

		setters: {}

	});

	osm.MarkerData = GSModel.extend({
		getters: {
			lat: fixedFloatGetter( 'lat', options.accuracy ),
			lng: fixedFloatGetter( 'lng', options.accuracy ),
		},
		setters: {
			lat: fixedFloatSetter( 'lat', options.accuracy ),
			lng: fixedFloatSetter( 'lng', options.accuracy ),
		},
		isDefaultLabel:function() {
			return this.get('label') === this.get('default_label');
		}
	});
	osm.MarkerCollection = Backbone.Collection.extend({
		model: osm.MarkerData
	});


	osm.MapData = GSModel.extend({
		getters: {
			lat: fixedFloatGetter( 'lat', options.accuracy ),
			lng: fixedFloatGetter( 'lng', options.accuracy ),
			zoom: intGetter('zoom'),
		},
		setters: {
			lat: fixedFloatSetter( 'lat', options.accuracy ),
			lng: fixedFloatSetter( 'lng', options.accuracy ),
			zoom: intSetter('zoom'),
		},
		initialize:function(o) {
			this.set( 'markers', new osm.MarkerCollection(o.markers) );
			GSModel.prototype.initialize.apply(this,arguments)
		}
	});
	
	osm.MarkerEntry = wp.Backbone.View.extend({
		tagName: 'div',
		className:'osm-marker',
		template:wp.template('osm-marker-input'),
		events: {
			'click [data-name="locate-marker"]' : 'locate_marker',
			'click [data-name="remove-marker"]' : 'remove_marker',
			'change [data-name="label"]'		: 'update_marker_label',
//			'focus [type="text"]'				: 'hilite_marker'
		},
		initialize:function(opt){
			wp.media.View.prototype.initialize.apply(this,arguments);
			this.marker = opt.marker; // leaflet marker
			this.marker.osm_controller = this;
			this.model = opt.model;
			this.listenTo( this.model, 'change:label', this.changedLabel );
			this.listenTo( this.model, 'change:default_label', this.changedDefaultLabel );
			this.listenTo( this.model, 'change:lat', this.changedlatLng );
			this.listenTo( this.model, 'change:lng', this.changedlatLng );
			this.listenTo( this.model, 'destroy', this.remove );

			return this.render();
		},
		changedLabel: function() {
			var label = this.model.get('label');
			this.$('[data-name="label"]').val( label ).trigger('change');

			this.marker.unbindTooltip();
			this.marker.bindTooltip(label);

			this.marker.options.title = label;

			$( this.marker._icon ).attr( 'title', label );

		},
		changedDefaultLabel: function() {
			// update label too, if
			if ( this.model.get('label') === this.model.previous('default_label') ) {
				this.model.set('label', this.model.get('default_label') );
			}
		},
		changedlatLng: function() {
			this.marker.setLatLng( { lat:this.model.get('lat'), lng:this.model.get('lng') } )
			acf.doAction('acf-osm/update-marker-latlng', this.model, this.options.controller.field );
		},
		render:function(){
			wp.media.View.prototype.render.apply(this,arguments);
			var self = this;

			this.$el.find('[data-name="label"]')
				.on('focus',function(e) {
					self.hilite_marker();
				})
				.on('blur',function(e) {
					self.lolite_marker();
				})
				.val( this.model.get('label') ).trigger('change');
			$(this.marker._icon)
				.on('focus',function(e){
					self.hilite_marker();
				})
				.on('blur',function(e){
					self.lolite_marker();
				})
			return this;
		},
		update_marker_label:function(e) {
			var label = $(e.target).val();
			if ( '' === label ) {
				label = this.model.get('default_label');
			}
			this.model.set('label', label );
			return this;
		},
		update_marker_geocode:function( label ) {

			if ( this.model.isDefaultLabel() ) {
				// update marker labels
				this.set_marker_label( label );
				// update marker label input
			}

			this.$el.find('[id$="-marker-geocode"]').val( label ).trigger('change');

			this._update_values_from_marker();

			return this;
		},
		_update_values_from_marker: function( ) {
			var latlng = this.marker.getLatLng();
			/*
			this.$el.find('[id$="-marker-lat"]').val( latlng.lat );
			this.$el.find('[id$="-marker-lng"]').val( latlng.lng );
			this.$el.find('[id$="-marker-label"]').val( this.marker.options.title );
			/*/
			this.model.set( 'lat', latlng.lat );
			this.model.set( 'lng', latlng.lng );
			this.model.set( 'label', this.marker.options.title );
			//*/
			return this;
		},
		hilite_marker:function(e) {
			this.$el.addClass('focus');
			$( this.marker._icon ).addClass('focus')
		},
		lolite_marker:function(e) {
			this.$el.removeClass('focus');
			$( this.marker._icon ).removeClass('focus')
		},
		locate_marker:function(){
			this.marker._map.flyTo( this.marker.getLatLng() );
			return this;
		},
		remove_marker:function(e) {
			// click remove
			e.preventDefault();
			this.model.destroy(); //
			return this;
		},
		pling:function() {
			$(this.marker._icon).html('').append('<span class="pling"></span>');
		}
	});

	osm.Field = Backbone.View.extend({

		map: null,
		field: null,
		geocoder: null,
		locator: null,
		visible: null,
		$parent:function(){
			return this.$el.closest('.acf-field-settings,.acf-field-open-street-map')
		},
		$value: function() {
			return this.$parent().find('input.osm-json');
		},
		$results : function() {
			return this.$parent().find('.osm-results');
		},
		$markers:function(){
			return this.$parent().find('.osm-markers');
		},
		preventDefault: function( e ) {
			e.preventDefault();
		},
		initialize:function(conf) {

			var self = this,
				data = this.getMapData();

			this.config		= this.$el.data().editorConfig;

			this.map		= conf.map;

			this.field		= conf.field;

			this.model		= new osm.MapData(data);

			this.plingMarker = false;

			this.init_locator_add();

			this.init_locator();

			// !! only if a) in editor && b) markers allowed !!
			if ( this.config.max_markers !== 0 ) {
				this.init_fit_bounds();
			}

			this.init_acf();

			if ( this.config.allow_providers ) {
				// prevent default layer creation
				this.el.addEventListener( 'acf-osm-map-create-layers', this.preventDefault )

				this.initLayers();
			}

			this.el.addEventListener( 'acf-osm-map-create-markers', this.preventDefault )
			
			// reset markers in case field was duplicated with a row
			self.$markers().html('')
			this.initMarkers();

			this.listenTo( this.model, 'change', this.updateValue );
			this.listenTo( this.model.get('markers'), 'add', this.addMarker );
			this.listenTo( this.model.get('markers'), 'add', this.updateValue );
			this.listenTo( this.model.get('markers'), 'remove', this.updateValue );
			this.listenTo( this.model.get('markers'), 'change', this.updateValue );
			//this.listenTo( this.model, 'change:layers', console.trace );

			// update on map view change
			this.map.on('zoomend',function(){
				self.model.set('zoom',self.map.getZoom());
			});
			this.map.on('moveend',function(){
				var latlng = self.map.getCenter();

				self.model.set('lat',latlng.lat );
				self.model.set('lng',latlng.lng );
			});

			this.update_visible();

			this.update_map();


			// kb navigation might interfere with other kb listeners
			this.map.keyboard.disable();

			acf.addAction('remount_field/type=open_street_map', function(field){
				if ( self.field === field ) {
					self.map.invalidateSize();
				}
			})
			return this;
		},
		init_fit_bounds:function() {
			var self = this
			// 2do: externalize L.Control.FitBoundsControl
			this.fitBoundsControl = new L.Control.FitBoundsControl({
				position: 'bottomright',
				callback: function() {
					var markers = self.model.get('markers')
					var llb = L.latLngBounds();
					if ( markers.length === 0 ) {
						return;
					}
					markers.forEach( function(marker) {
						llb.extend(L.latLng(marker.get('lat'),marker.get('lng')))
					});
					self.map.fitBounds(llb);
				}
			}).addTo(this.map);

		},
		init_locator_add:function() {
			var self = this

			this.locatorAdd = new L.Control.AddLocationMarker({
				position: 'bottomleft',
				callback: function() {
					if ( self.$el.attr('data-can-add-marker') === 'true' ) {
						self.currentLocation && self.addMarkerByLatLng( self.currentLocation );
					}
					self.locator.stop();
				}
			}).addTo(this.map);

		},
		init_locator:function() {
			var self = this;
			this.currentLocation = false;

			this.locator = L.control.locate({
			    position: 'bottomleft',
				icon: 'dashicons dashicons-location-alt',
				iconLoading:'spinner is-active',
				flyTo:true,
			    strings: {
			        title: i18n.my_location
			    },
				onLocationError:function(err) {}
			}).addTo(this.map);


			this.map.on('locationfound',function(e){

				self.currentLocation = e.latlng;

				setTimeout(function(){
					self.locator.stopFollowing();
					$(self.locator._icon).removeClass('dashicons-warning');
					//self.locatorAdd.addTo(self.map)
				},1);
			})
			this.map.on('locationerror',function(e){
				self.currentLocation = false;
				setTimeout(function(){
					$(self.locator._icon).addClass('dashicons-warning');
				},1);
			})
		},
		getMapData:function() {
			var data = JSON.parse( this.$value().val() );
			data.lat = data.lat || this.$el.attr('data-map-lat');
			data.lng = data.lng || this.$el.attr('data-map-lng');
			data.zoom = data.zoom || this.$el.attr('data-map-zoom');
			return data;
		},
		updateValue:function() {
			this.$value().val( JSON.stringify( this.model.toJSON() ) ).trigger('change');
			//this.$el.trigger('change')
			this.updateMarkerState();
		},
		updateMarkerState:function() {
			var len = this.model.get('markers').length;
			this.$el.attr('data-has-markers', !!len ? 'true' : 'false');
			this.$el.attr('data-can-add-marker', ( false === this.config.max_markers || len < this.config.max_markers) ? 'true' : 'false');
		},
		/**
		 *	Markers
		 */
		addMarker:function( model, collection ) {

			var self = this;
			// add marker to map
			var marker = L.marker( { lat: model.get('lat'), lng: model.get('lng') }, {
					title: model.get('label'),
					icon: this.icon,
					draggable: true
				})
				.bindTooltip( model.get('label') );

			//
			var entry = new osm.MarkerEntry({
				controller: this,
				marker: marker,
				model: model
			});

			this.map.once('layeradd',function(e){

				marker
					.on('click',function(e){
						model.destroy();
					})
					.on('dragend',function(e){
						// update model lnglat
						var latlng = this.getLatLng();
						model.set( 'lat', latlng.lat );
						model.set( 'lng', latlng.lng );
						self.reverseGeocode( model );
						// geocode, get label, set model label...
					})

				entry.$el.appendTo( self.$markers() );
			});

			model.on( 'destroy', function() {
				acf.doAction('acf-osm/destroy-marker', model, self.field );
				marker.remove();
			});

			marker.addTo( this.map );
			if ( this.plingMarker ) {
				entry.pling();
			}
			

		},
		initMarkers:function(){

			var self = this;

			this.initGeocode();
			this.$el.attr('data-has-markers', 'false');
			this.$el.attr('data-can-add-marker', 'false');

			// no markers allowed!
			if ( this.config.max_markers === 0 ) {
				return;
			}

			this.icon = new L.DivIcon({
				html: '',
				className:'osm-marker-icon'
			});

			this.model.get('markers').forEach( function( model ) {
				self.addMarker( model );
			} );

			// dbltap is not firing on mobile
			if ( L.Browser.touch && L.Browser.mobile ) {
				this._add_marker_on_hold();
			} else {
				this._add_marker_on_dblclick();
			}

			this.updateMarkerState();

		},
		_add_marker_on_dblclick: function() {
			var self = this;
			this.map.on('dblclick', function(e){
				var latlng = e.latlng;

				L.DomEvent.preventDefault(e);
				L.DomEvent.stopPropagation(e);

				self.addMarkerByLatLng( latlng );
			})
			.doubleClickZoom.disable();
			this.$el.addClass('add-marker-on-dblclick')
		},
		_add_marker_on_hold: function() {
			if ( L.Browser.pointer ) {
				// use pointer events
				this._add_marker_on_hold_pointer();
			} else {
				// use touch events
				this._add_marker_on_hold_touch();
			}
			this.$el.addClass('add-marker-on-taphold')
		},
		_add_marker_on_hold_pointer: function() {
			var self = this,
				_hold_timeout = 750,
				_hold_wait_to = {};
			L.DomEvent
				.on(this.map.getContainer(),'pointerdown',function(e){
					_hold_wait_to[ 'p'+e.pointerId ] = setTimeout(function(){
						var cp = self.map.mouseEventToContainerPoint(e);
						var lp = self.map.containerPointToLayerPoint(cp)

						self.addMarkerByLatLng( self.map.layerPointToLatLng(lp) )

						_hold_wait_to[ 'p'+e.pointerId ] = false;
					}, _hold_timeout );
				})
				.on(this.map.getContainer(), 'pointerup pointermove', function(e){
					!! _hold_wait_to[ 'p'+e.pointerId ] && clearTimeout( _hold_wait_to[ 'p'+e.pointerId ] );
				});
		},
		_add_marker_on_hold_touch:function() {
			var self = this,
				_hold_timeout = 750,
				_hold_wait_to = false;
			L.DomEvent
				.on(this.map.getContainer(),'touchstart',function(e){
					if ( e.touches.length !== 1 ) {
						return;
					}
					_hold_wait_to = setTimeout(function(){

						var cp = self.map.mouseEventToContainerPoint(e.touches[0]);
						var lp = self.map.containerPointToLayerPoint(cp)

						self.addMarkerByLatLng( self.map.layerPointToLatLng(lp) )

						_hold_wait_to = false;
					}, _hold_timeout );
				})
				.on(this.map.getContainer(), 'touchend touchmove', function(e){
					!! _hold_wait_to && clearTimeout( _hold_wait_to[ 'p'+e.pointerId ] );
				});
		},
		addMarkerByLatLng:function(latlng) {
			var collection = this.model.get('markers'),
				model;
			// no more markers
			if ( this.config.max_markers !== false && collection.length >= this.config.max_markers ) {
				return;
			}
			model = new osm.MarkerData({
				label: '',
				default_label: '',
				lat: latlng.lat,
				lng: latlng.lng,
				geocode: [],
				uuid: acf.uniqid('marker_'),
			});

			this.plingMarker = true;
			collection.add( model );
			this.reverseGeocode( model );

			acf.doAction('acf-osm/create-marker', model, this.field );
			acf.doAction('acf-osm/update-marker-latlng', model, this.field );

		},
		/**
		 *	Geocoding
		 *
		 *	@on map.layeradd, layer.dragend
		 */
		initGeocode:function() {

 			var self = this,
				$above = this.$el.prev();
			if ( ! $above.is( '.acf-osm-above' ) ) {
				$above = $('<div class="acf-osm-above"></div>').insertBefore( this.$el );
			} else {
				$above.html('');
			}
			// add an extra control panel region for out search
 			this.map._controlCorners['above'] = $above.get(0);

 			this.geocoder = L.Control.geocoder({
 				collapsed: false,
 				position:'above',
 				placeholder:i18n.search,
 				errorMessage:i18n.nothing_found,
 				showResultIcons:true,
 				suggestMinLength:3,
 				suggestTimeout:250,
 				queryMinLength:3,
 				defaultMarkGeocode:false,
				geocoder:L.Control.Geocoder.nominatim({
					htmlTemplate: function(result) {
						var parts = [],
							templateConfig = {
								interpolate: /\{(.+?)\}/g
							},
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

						parts.push( _.template( i18n.address_format.street, templateConfig )( addr ) );

						parts.push( _.template( i18n.address_format.city, templateConfig )( addr ) );

						parts.push( _.template( i18n.address_format.country, templateConfig )( addr ) );

						return parts
							.map( function(el) { return el.replace(/\s+/g,' ').trim() } )
							.filter( function(el) { return el !== '' } )
							.join(', ')
					}
				})
 			})
 			.on('markgeocode',function(e){
 				// search result click

 				var latlng =  e.geocode.center,
 					count_markers = self.model.get('markers').length,
 					label = self.parseGeocodeResult( [ e.geocode ], latlng ),
 					marker_data = {
 						label: label,
 						default_label: label,
 						lat: latlng.lat,
 						lng: latlng.lng,
						geocode: [],
 					},
 					model,
					marker,
					previousGeocode = false;

				// getting rid of the modal – #35
				self.geocoder._clearResults();
				self.geocoder._input.value = '';

				// no markers - just adapt map view
 				if ( self.config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}


 				if ( self.config.max_markers === false || count_markers < self.config.max_markers ) {
					marker_data.uuid = acf.uniqid('marker_')
					// infinite markers or markers still in range
 					marker = self.model.get('markers').add( marker_data );

 				} else if ( self.config.max_markers === 1 ) {
					// one marker only
					marker = self.model.get('markers').at(0)
					previousGeocode = marker.get('geocode')
 					marker.set( marker_data );

 				}

				acf.doAction('acf-osm/marker-geocode-result', marker.model, self.field, [ e.geocode ], previousGeocode );

 				self.map.setView( latlng, self.map.getZoom() ); // keep zoom, might be confusing else

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

/*

*/
console.log(this.geocoder)
 		},
		reverseGeocode:function( model ) {
			var self = this,
				latlng = { lat: model.get('lat'), lng: model.get('lng') };
			this.geocoder.options.geocoder.reverse(
				latlng,
				self.map.getZoom(),
				/**
				 *	@param array results
				 */
				function( results ) {
					acf.doAction('acf-osm/marker-geocode-result', model, self.field, results, model.get('geocode' ) );
					model.set('geocode', results );
					model.set('default_label', self.parseGeocodeResult( results, latlng ) );
				}
			);
		},
		parseGeocodeResult: function( results, latlng ) {
			var label = false;

			if ( ! results.length ) {
				label = latlng.lat + ', ' + latlng.lng;
			} else {
				$.each( results, function( i, result ) {

					label = result.html;

				});
			}
			// trim
			return label;
		},



		/**
		 *	Layers
	 	*/
		initLayers:function() {
			var self = this,
				selectedLayers = [],
				baseLayers = {},
				overlays = {},
				is_omitted = function(key) {
					return key === null || ( !! self.config.restrict_providers && self.config.restrict_providers.indexOf( key ) === -1 );
				},
				setupMap = function( val, key ){
					var layer;
					if ( _.isObject(val) ) {
						return $.each( val, setupMap );
					}

					if ( is_omitted(key) ) {
						return;
					}

					try {
						layer = L.tileLayer.provider( key /*, layer_config.options*/ );
					} catch(ex) {
						return;
					}
					layer.providerKey = key;

					if ( self.layer_is_overlay( key, layer ) ) {
						overlays[key] = layer;
					} else {
						baseLayers[key] = layer;
					}

					if ( selectedLayers.indexOf( key ) !== -1 ) {
						self.map.addLayer(layer);
 					}
 				};

 			selectedLayers = this.model.get('layers'); // should be layer store value

 			// filter avaialble layers in field value
 			if ( this.config.restrict_providers !== false && _.isArray( this.config.restrict_providers ) ) {
 				selectedLayers = selectedLayers.filter( function(el) {
 					return self.config.restrict_providers.indexOf( el ) !== -1;
 				});
 			}

 			// set default layer
 			if ( ! selectedLayers.length ) {

 				selectedLayers = this.config.restrict_providers.slice( 0, 1 );

 			}

 			// editable layers!

			this.map.on( 'baselayerchange layeradd layerremove', function(e){

				if ( ! e.layer.providerKey ) {
					return;
				}
				var layers = [];

				self.map.eachLayer(function(layer) {
					if ( ! layer.providerKey ) {
						return;
					}

					if ( self.layer_is_overlay( layer.providerKey, layer ) ) {
						layers.push( layer.providerKey )
					} else {
						layers.unshift( layer.providerKey )
					}
				});
				self.model.set( 'layers', layers );
			} );

 			$.each( this.config.restrict_providers, setupMap );

			this.layersControl = L.control.layers( baseLayers, overlays, {
				collapsed: true,
				hideSingleBase: true,
			}).addTo(this.map);
 		},
		layer_is_overlay: function(  key, layer ) {

			if ( layer.options.opacity && layer.options.opacity < 1 ) {
				return true;
			}

			var patterns = [
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
				'HERE(v3?).mapLabels'
			].join('|');
			return key.match('(' + patterns + ')') !== null;
		},
		resetLayers:function() {
			// remove all map layers
			this.map.eachLayer(function(layer){
				if ( layer.constructor === L.TileLayer.Provider ) {
					layer.remove();
				}
			})

			// remove layer control
			!! this.layersControl && this.layersControl.remove()
		},
		update_visible: function() {

			if ( this.visible === this.$el.is(':visible') ) {
				return this;
			}

			this.visible = this.$el.is(':visible');

			if ( this.visible ) {
				this.map.invalidateSize();
			}
			return this;
		},
		init_acf: function() {
			var self = this,
				toggle_cb = function() {
					// no change
					self.update_visible();
				};

			// expand/collapse acf setting
			acf.addAction( 'show', toggle_cb );
			acf.addAction( 'hide', toggle_cb );

			// expand wp metabox
			$(document).on('postbox-toggled', toggle_cb );
			$(document).on('click','.widget-top *', toggle_cb );

		},
		update_map:function() {
			var latlng = { lat: this.model.get('lat'), lng: this.model.get('lng') }
			this.map.setView(
				latlng,
				this.model.get('zoom')
			);
		}
	});


	$(document)
		.on( 'acf-osm-map-create', function( e ) {
			if ( ! L.Control.AddLocationMarker ) {
				L.Control.AddLocationMarker = L.Control.extend({
					onAdd:function() {

						this._container = L.DomUtil.create('div',
							'leaflet-control-add-location-marker leaflet-bar leaflet-control');

						this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container);
						this._link.title = i18n.add_marker_at_location;
						this._icon = L.DomUtil.create('span', 'dashicons dashicons-location', this._link);
						L.DomEvent
							.on( this._link, 'click', L.DomEvent.stopPropagation)
							.on( this._link, 'click', L.DomEvent.preventDefault)
							.on( this._link, 'click', this.options.callback, this)
							.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

						return this._container;
					},
					onRemove:function() {
						L.DomEvent
							.off(this._link, 'click', L.DomEvent.stopPropagation )
							.off(this._link, 'click', L.DomEvent.preventDefault )
							.off(this._link, 'click', this.options.callback, this )
							.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
					},
				})
			}
			if ( ! L.Control.FitBoundsControl ) {
				L.Control.FitBoundsControl = L.Control.extend({
					onAdd:function() {

						this._container = L.DomUtil.create('div',
							'leaflet-control-fit-bounds leaflet-bar leaflet-control');

						this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container );
						this._link.title = i18n.fit_markers_in_view;
						this._icon = L.DomUtil.create('span', 'dashicons dashicons-editor-expand', this._link );
						L.DomEvent
							.on( this._link, 'click', L.DomEvent.stopPropagation )
							.on( this._link, 'click', L.DomEvent.preventDefault )
							.on( this._link, 'click', this.options.callback, this )
							.on( this._link, 'dblclick', L.DomEvent.stopPropagation );

						return this._container;
					},
					onRemove:function() {
						L.DomEvent
							.off(this._link, 'click', L.DomEvent.stopPropagation )
							.off(this._link, 'click', L.DomEvent.preventDefault )
							.off(this._link, 'click', this.options.callback, this )
							.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
					},
				});
			}


			// don't init in repeater templates
			if ( $(e.target).closest('[data-id="acfcloneindex"]').length ) {
				e.preventDefault();
				return;
			}
		})
		.on( 'acf-osm-map-init', function( e ) {
			var editor, field,
				map = e.detail.map;

			// wrap osm.Field backbone view around editors
			if ( $(e.target).is('[data-editor-config]') ) {
				// e.preventDefault();

				(function checkVis(){
					if ( ! $(e.target).is(':visible') ) {
						return setTimeout( checkVis, 250 );
					}
					map.invalidateSize();
				})();
				field = acf.getField( $(e.target).closest('.acf-field') )
				editor = new osm.Field( { el: e.target, map: map, field: field } );
				field.set( 'osmEditor', editor )
				$(e.target).data( '_map_editor', editor );
			}
		});

	// init when fields get loaded ...
	acf.addAction( 'append', function(){
		$.acf_leaflet();
	});
	// init when fields show ...
	acf.addAction( 'show_field', function( field ) {

		if ( 'open_street_map' !== field.type ) {
			return;
		}
	    var editor = field.$el.find('[data-editor-config]').data( '_map_editor' );
	    editor.update_visible();
	});

	acf.registerFieldType(acf.Field.extend({
		type: 'open_street_map'
	}));

})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtaW5wdXQtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9wdGlvbnMgPSBhcmcub3B0aW9ucyxcblx0XHRpMThuID0gYXJnLmkxOG4sXG5cdFx0cmVzdWx0X3RwbCA9ICc8ZGl2IHRhYmluZGV4PVwiPCU9IGRhdGEuaSAlPlwiIGNsYXNzPVwib3NtLXJlc3VsdFwiPidcblx0XHRcdCsgJzwlPSBkYXRhLnJlc3VsdF90ZXh0ICU+J1xuXHRcdFx0KyAnPGJyIC8+PHNtYWxsPjwlPSBkYXRhLnByb3BlcnRpZXMub3NtX3ZhbHVlICU+PC9zbWFsbD4nXG5cdFx0XHQrICc8L2Rpdj4nO1xuXG5cdHZhciBvc20gPSBleHBvcnRzLm9zbSA9IHtcblx0fTtcblxuXHR2YXIgbG9jYXRvckFkZENvbnRyb2wgPSBudWxsO1xuXG5cdHZhciBmaXhlZEZsb2F0R2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGZpeGVkRmxvYXRTZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQocGFyc2VGbG9hdCh2YWx1ZSkudG9GaXhlZChmaXgpICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRHZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50U2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KCB2YWx1ZSApO1xuXHRcdH1cblx0fVxuXG5cdHZhciBHU01vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuXHRcdGdldDogZnVuY3Rpb24oYXR0cikge1xuXHRcdFx0Ly8gQ2FsbCB0aGUgZ2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLmdldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmdldHRlcnNbYXR0cl0uY2FsbCh0aGlzKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBhdHRyKTtcblx0XHR9LFxuXG5cdFx0c2V0OiBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB7XG5cdFx0XHR2YXIgYXR0cnMsIGF0dHI7XG5cblx0XHRcdC8vIE5vcm1hbGl6ZSB0aGUga2V5LXZhbHVlIGludG8gYW4gb2JqZWN0XG5cdFx0XHRpZiAoXy5pc09iamVjdChrZXkpIHx8IGtleSA9PSBudWxsKSB7XG5cdFx0XHRcdGF0dHJzID0ga2V5O1xuXHRcdFx0XHRvcHRpb25zID0gdmFsdWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhdHRycyA9IHt9O1xuXHRcdFx0XHRhdHRyc1trZXldID0gdmFsdWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGFsd2F5cyBwYXNzIGFuIG9wdGlvbnMgaGFzaCBhcm91bmQuIFRoaXMgYWxsb3dzIG1vZGlmeWluZ1xuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgaW5zaWRlIHRoZSBzZXR0ZXJcblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0XHQvLyBHbyBvdmVyIGFsbCB0aGUgc2V0IGF0dHJpYnV0ZXMgYW5kIGNhbGwgdGhlIHNldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGZvciAoYXR0ciBpbiBhdHRycykge1xuXHRcdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuc2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0XHRhdHRyc1thdHRyXSA9IHRoaXMuc2V0dGVyc1thdHRyXS5jYWxsKHRoaXMsIGF0dHJzW2F0dHJdLCBvcHRpb25zKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJzLCBvcHRpb25zKTtcblx0XHR9LFxuXG5cdFx0Z2V0dGVyczoge30sXG5cblx0XHRzZXR0ZXJzOiB7fVxuXG5cdH0pO1xuXG5cdG9zbS5NYXJrZXJEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGxhdDogZml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzogZml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDogZml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzogZml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOiBvc20uTWFya2VyRGF0YVxuXHR9KTtcblxuXG5cdG9zbS5NYXBEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGxhdDogZml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzogZml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206IGludEdldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OiBmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOiBmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTogaW50U2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG8pIHtcblx0XHRcdHRoaXMuc2V0KCAnbWFya2VycycsIG5ldyBvc20uTWFya2VyQ29sbGVjdGlvbihvLm1hcmtlcnMpICk7XG5cdFx0XHRHU01vZGVsLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKVxuXHRcdH1cblx0fSk7XG5cdFxuXHRvc20uTWFya2VyRW50cnkgPSB3cC5CYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdFx0dGFnTmFtZTogJ2RpdicsXG5cdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyJyxcblx0XHR0ZW1wbGF0ZTp3cC50ZW1wbGF0ZSgnb3NtLW1hcmtlci1pbnB1dCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJsb2NhdGUtbWFya2VyXCJdJyA6ICdsb2NhdGVfbWFya2VyJyxcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwicmVtb3ZlLW1hcmtlclwiXScgOiAncmVtb3ZlX21hcmtlcicsXG5cdFx0XHQnY2hhbmdlIFtkYXRhLW5hbWU9XCJsYWJlbFwiXSdcdFx0OiAndXBkYXRlX21hcmtlcl9sYWJlbCcsXG4vL1x0XHRcdCdmb2N1cyBbdHlwZT1cInRleHRcIl0nXHRcdFx0XHQ6ICdoaWxpdGVfbWFya2VyJ1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvcHQpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLm1hcmtlciA9IG9wdC5tYXJrZXI7IC8vIGxlYWZsZXQgbWFya2VyXG5cdFx0XHR0aGlzLm1hcmtlci5vc21fY29udHJvbGxlciA9IHRoaXM7XG5cdFx0XHR0aGlzLm1vZGVsID0gb3B0Lm1vZGVsO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYWJlbCcsIHRoaXMuY2hhbmdlZExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmRlZmF1bHRfbGFiZWwnLCB0aGlzLmNoYW5nZWREZWZhdWx0TGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxuZycsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLnJlbW92ZSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5yZW5kZXIoKTtcblx0XHR9LFxuXHRcdGNoYW5nZWRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKTtcblx0XHRcdHRoaXMuJCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci51bmJpbmRUb29sdGlwKCk7XG5cdFx0XHR0aGlzLm1hcmtlci5iaW5kVG9vbHRpcChsYWJlbCk7XG5cblx0XHRcdHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgPSBsYWJlbDtcblxuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hdHRyKCAndGl0bGUnLCBsYWJlbCApO1xuXG5cdFx0fSxcblx0XHRjaGFuZ2VkRGVmYXVsdExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVwZGF0ZSBsYWJlbCB0b28sIGlmXG5cdFx0XHRpZiAoIHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpID09PSB0aGlzLm1vZGVsLnByZXZpb3VzKCdkZWZhdWx0X2xhYmVsJykgKSB7XG5cdFx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIHRoaXMubW9kZWwuZ2V0KCdkZWZhdWx0X2xhYmVsJykgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNoYW5nZWRsYXRMbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5tYXJrZXIuc2V0TGF0TG5nKCB7IGxhdDp0aGlzLm1vZGVsLmdldCgnbGF0JyksIGxuZzp0aGlzLm1vZGVsLmdldCgnbG5nJykgfSApXG5cdFx0XHRhY2YuZG9BY3Rpb24oJ2FjZi1vc20vdXBkYXRlLW1hcmtlci1sYXRsbmcnLCB0aGlzLm1vZGVsLCB0aGlzLm9wdGlvbnMuY29udHJvbGxlci5maWVsZCApO1xuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudmFsKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbilcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfbGFiZWw6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIGxhYmVsID0gJChlLnRhcmdldCkudmFsKCk7XG5cdFx0XHRpZiAoICcnID09PSBsYWJlbCApIHtcblx0XHRcdFx0bGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgbGFiZWwgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9nZW9jb2RlOmZ1bmN0aW9uKCBsYWJlbCApIHtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmlzRGVmYXVsdExhYmVsKCkgKSB7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWxzXG5cdFx0XHRcdHRoaXMuc2V0X21hcmtlcl9sYWJlbCggbGFiZWwgKTtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbCBpbnB1dFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLl91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyKCk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0X3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXI6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKTtcblx0XHRcdC8qXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYXRcIl0nKS52YWwoIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxuZ1wiXScpLnZhbCggbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKS52YWwoIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8qL1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGFiZWwnLCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvLyovXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGhpbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmFkZENsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2xpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5yZW1vdmVDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9jYXRlX21hcmtlcjpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5tYXJrZXIuX21hcC5mbHlUbyggdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCkgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVtb3ZlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyBjbGljayByZW1vdmVcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMubW9kZWwuZGVzdHJveSgpOyAvL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRwbGluZzpmdW5jdGlvbigpIHtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pLmh0bWwoJycpLmFwcGVuZCgnPHNwYW4gY2xhc3M9XCJwbGluZ1wiPjwvc3Bhbj4nKTtcblx0XHR9XG5cdH0pO1xuXG5cdG9zbS5GaWVsZCA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuXHRcdG1hcDogbnVsbCxcblx0XHRmaWVsZDogbnVsbCxcblx0XHRnZW9jb2RlcjogbnVsbCxcblx0XHRsb2NhdG9yOiBudWxsLFxuXHRcdHZpc2libGU6IG51bGwsXG5cdFx0JHBhcmVudDpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MsLmFjZi1maWVsZC1vcGVuLXN0cmVldC1tYXAnKVxuXHRcdH0sXG5cdFx0JHZhbHVlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCdpbnB1dC5vc20tanNvbicpO1xuXHRcdH0sXG5cdFx0JHJlc3VsdHMgOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcub3NtLXJlc3VsdHMnKTtcblx0XHR9LFxuXHRcdCRtYXJrZXJzOmZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1tYXJrZXJzJyk7XG5cdFx0fSxcblx0XHRwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKGNvbmYpIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRkYXRhID0gdGhpcy5nZXRNYXBEYXRhKCk7XG5cblx0XHRcdHRoaXMuY29uZmlnXHRcdD0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZztcblxuXHRcdFx0dGhpcy5tYXBcdFx0PSBjb25mLm1hcDtcblxuXHRcdFx0dGhpcy5maWVsZFx0XHQ9IGNvbmYuZmllbGQ7XG5cblx0XHRcdHRoaXMubW9kZWxcdFx0PSBuZXcgb3NtLk1hcERhdGEoZGF0YSk7XG5cblx0XHRcdHRoaXMucGxpbmdNYXJrZXIgPSBmYWxzZTtcblxuXHRcdFx0dGhpcy5pbml0X2xvY2F0b3JfYWRkKCk7XG5cblx0XHRcdHRoaXMuaW5pdF9sb2NhdG9yKCk7XG5cblx0XHRcdC8vICEhIG9ubHkgaWYgYSkgaW4gZWRpdG9yICYmIGIpIG1hcmtlcnMgYWxsb3dlZCAhIVxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyAhPT0gMCApIHtcblx0XHRcdFx0dGhpcy5pbml0X2ZpdF9ib3VuZHMoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pbml0X2FjZigpO1xuXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLmFsbG93X3Byb3ZpZGVycyApIHtcblx0XHRcdFx0Ly8gcHJldmVudCBkZWZhdWx0IGxheWVyIGNyZWF0aW9uXG5cdFx0XHRcdHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2FjZi1vc20tbWFwLWNyZWF0ZS1sYXllcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0IClcblxuXHRcdFx0XHR0aGlzLmluaXRMYXllcnMoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCAnYWNmLW9zbS1tYXAtY3JlYXRlLW1hcmtlcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0IClcblx0XHRcdFxuXHRcdFx0Ly8gcmVzZXQgbWFya2VycyBpbiBjYXNlIGZpZWxkIHdhcyBkdXBsaWNhdGVkIHdpdGggYSByb3dcblx0XHRcdHNlbGYuJG1hcmtlcnMoKS5odG1sKCcnKVxuXHRcdFx0dGhpcy5pbml0TWFya2VycygpO1xuXG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMuYWRkTWFya2VyICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ3JlbW92ZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHQvL3RoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF5ZXJzJywgY29uc29sZS50cmFjZSApO1xuXG5cdFx0XHQvLyB1cGRhdGUgb24gbWFwIHZpZXcgY2hhbmdlXG5cdFx0XHR0aGlzLm1hcC5vbignem9vbWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ3pvb20nLHNlbGYubWFwLmdldFpvb20oKSk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gc2VsZi5tYXAuZ2V0Q2VudGVyKCk7XG5cblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xhdCcsbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbG5nJyxsYXRsbmcubG5nICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy51cGRhdGVfdmlzaWJsZSgpO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV9tYXAoKTtcblxuXG5cdFx0XHQvLyBrYiBuYXZpZ2F0aW9uIG1pZ2h0IGludGVyZmVyZSB3aXRoIG90aGVyIGtiIGxpc3RlbmVyc1xuXHRcdFx0dGhpcy5tYXAua2V5Ym9hcmQuZGlzYWJsZSgpO1xuXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCdyZW1vdW50X2ZpZWxkL3R5cGU9b3Blbl9zdHJlZXRfbWFwJywgZnVuY3Rpb24oZmllbGQpe1xuXHRcdFx0XHRpZiAoIHNlbGYuZmllbGQgPT09IGZpZWxkICkge1xuXHRcdFx0XHRcdHNlbGYubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGluaXRfZml0X2JvdW5kczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpc1xuXHRcdFx0Ly8gMmRvOiBleHRlcm5hbGl6ZSBMLkNvbnRyb2wuRml0Qm91bmRzQ29udHJvbFxuXHRcdFx0dGhpcy5maXRCb3VuZHNDb250cm9sID0gbmV3IEwuQ29udHJvbC5GaXRCb3VuZHNDb250cm9sKHtcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b21yaWdodCcsXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgbWFya2VycyA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJylcblx0XHRcdFx0XHR2YXIgbGxiID0gTC5sYXRMbmdCb3VuZHMoKTtcblx0XHRcdFx0XHRpZiAoIG1hcmtlcnMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXJrZXJzLmZvckVhY2goIGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRcdFx0bGxiLmV4dGVuZChMLmxhdExuZyhtYXJrZXIuZ2V0KCdsYXQnKSxtYXJrZXIuZ2V0KCdsbmcnKSkpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0c2VsZi5tYXAuZml0Qm91bmRzKGxsYik7XG5cdFx0XHRcdH1cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXHRcdH0sXG5cdFx0aW5pdF9sb2NhdG9yX2FkZDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpc1xuXG5cdFx0XHR0aGlzLmxvY2F0b3JBZGQgPSBuZXcgTC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyKHtcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b21sZWZ0Jyxcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICggc2VsZi4kZWwuYXR0cignZGF0YS1jYW4tYWRkLW1hcmtlcicpID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiAmJiBzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLmN1cnJlbnRMb2NhdGlvbiApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRzZWxmLmxvY2F0b3Iuc3RvcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG5cblx0XHR9LFxuXHRcdGluaXRfbG9jYXRvcjpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuY3VycmVudExvY2F0aW9uID0gZmFsc2U7XG5cblx0XHRcdHRoaXMubG9jYXRvciA9IEwuY29udHJvbC5sb2NhdGUoe1xuXHRcdFx0ICAgIHBvc2l0aW9uOiAnYm90dG9tbGVmdCcsXG5cdFx0XHRcdGljb246ICdkYXNoaWNvbnMgZGFzaGljb25zLWxvY2F0aW9uLWFsdCcsXG5cdFx0XHRcdGljb25Mb2FkaW5nOidzcGlubmVyIGlzLWFjdGl2ZScsXG5cdFx0XHRcdGZseVRvOnRydWUsXG5cdFx0XHQgICAgc3RyaW5nczoge1xuXHRcdFx0ICAgICAgICB0aXRsZTogaTE4bi5teV9sb2NhdGlvblxuXHRcdFx0ICAgIH0sXG5cdFx0XHRcdG9uTG9jYXRpb25FcnJvcjpmdW5jdGlvbihlcnIpIHt9XG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG5cblxuXHRcdFx0dGhpcy5tYXAub24oJ2xvY2F0aW9uZm91bmQnLGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdHNlbGYuY3VycmVudExvY2F0aW9uID0gZS5sYXRsbmc7XG5cblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHNlbGYubG9jYXRvci5zdG9wRm9sbG93aW5nKCk7XG5cdFx0XHRcdFx0JChzZWxmLmxvY2F0b3IuX2ljb24pLnJlbW92ZUNsYXNzKCdkYXNoaWNvbnMtd2FybmluZycpO1xuXHRcdFx0XHRcdC8vc2VsZi5sb2NhdG9yQWRkLmFkZFRvKHNlbGYubWFwKVxuXHRcdFx0XHR9LDEpO1xuXHRcdFx0fSlcblx0XHRcdHRoaXMubWFwLm9uKCdsb2NhdGlvbmVycm9yJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5jdXJyZW50TG9jYXRpb24gPSBmYWxzZTtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdCQoc2VsZi5sb2NhdG9yLl9pY29uKS5hZGRDbGFzcygnZGFzaGljb25zLXdhcm5pbmcnKTtcblx0XHRcdFx0fSwxKTtcblx0XHRcdH0pXG5cdFx0fSxcblx0XHRnZXRNYXBEYXRhOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSBKU09OLnBhcnNlKCB0aGlzLiR2YWx1ZSgpLnZhbCgpICk7XG5cdFx0XHRkYXRhLmxhdCA9IGRhdGEubGF0IHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxhdCcpO1xuXHRcdFx0ZGF0YS5sbmcgPSBkYXRhLmxuZyB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sbmcnKTtcblx0XHRcdGRhdGEuem9vbSA9IGRhdGEuem9vbSB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC16b29tJyk7XG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9LFxuXHRcdHVwZGF0ZVZhbHVlOmZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kdmFsdWUoKS52YWwoIEpTT04uc3RyaW5naWZ5KCB0aGlzLm1vZGVsLnRvSlNPTigpICkgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdC8vdGhpcy4kZWwudHJpZ2dlcignY2hhbmdlJylcblx0XHRcdHRoaXMudXBkYXRlTWFya2VyU3RhdGUoKTtcblx0XHR9LFxuXHRcdHVwZGF0ZU1hcmtlclN0YXRlOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxlbiA9IHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oYXMtbWFya2VycycsICEhbGVuID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJywgKCBmYWxzZSA9PT0gdGhpcy5jb25maWcubWF4X21hcmtlcnMgfHwgbGVuIDwgdGhpcy5jb25maWcubWF4X21hcmtlcnMpID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKlx0TWFya2Vyc1xuXHRcdCAqL1xuXHRcdGFkZE1hcmtlcjpmdW5jdGlvbiggbW9kZWwsIGNvbGxlY3Rpb24gKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdC8vIGFkZCBtYXJrZXIgdG8gbWFwXG5cdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfSwge1xuXHRcdFx0XHRcdHRpdGxlOiBtb2RlbC5nZXQoJ2xhYmVsJyksXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5pY29uLFxuXHRcdFx0XHRcdGRyYWdnYWJsZTogdHJ1ZVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYmluZFRvb2x0aXAoIG1vZGVsLmdldCgnbGFiZWwnKSApO1xuXG5cdFx0XHQvL1xuXHRcdFx0dmFyIGVudHJ5ID0gbmV3IG9zbS5NYXJrZXJFbnRyeSh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdG1hcmtlcjogbWFya2VyLFxuXHRcdFx0XHRtb2RlbDogbW9kZWxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbmNlKCdsYXllcmFkZCcsZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0bWFya2VyXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHRtb2RlbC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQub24oJ2RyYWdlbmQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIG1vZGVsIGxuZ2xhdFxuXHRcdFx0XHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMuZ2V0TGF0TG5nKCk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHRcdFx0XHRzZWxmLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdFx0XHRcdFx0Ly8gZ2VvY29kZSwgZ2V0IGxhYmVsLCBzZXQgbW9kZWwgbGFiZWwuLi5cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdGVudHJ5LiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bW9kZWwub24oICdkZXN0cm95JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFjZi5kb0FjdGlvbignYWNmLW9zbS9kZXN0cm95LW1hcmtlcicsIG1vZGVsLCBzZWxmLmZpZWxkICk7XG5cdFx0XHRcdG1hcmtlci5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtYXJrZXIuYWRkVG8oIHRoaXMubWFwICk7XG5cdFx0XHRpZiAoIHRoaXMucGxpbmdNYXJrZXIgKSB7XG5cdFx0XHRcdGVudHJ5LnBsaW5nKCk7XG5cdFx0XHR9XG5cdFx0XHRcblxuXHRcdH0sXG5cdFx0aW5pdE1hcmtlcnM6ZnVuY3Rpb24oKXtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLmluaXRHZW9jb2RlKCk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJywgJ2ZhbHNlJyk7XG5cblx0XHRcdC8vIG5vIG1hcmtlcnMgYWxsb3dlZCFcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pY29uID0gbmV3IEwuRGl2SWNvbih7XG5cdFx0XHRcdGh0bWw6ICcnLFxuXHRcdFx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXItaWNvbidcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmZvckVhY2goIGZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdFx0c2VsZi5hZGRNYXJrZXIoIG1vZGVsICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdC8vIGRibHRhcCBpcyBub3QgZmlyaW5nIG9uIG1vYmlsZVxuXHRcdFx0aWYgKCBMLkJyb3dzZXIudG91Y2ggJiYgTC5Ccm93c2VyLm1vYmlsZSApIHtcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2RibGNsaWNrKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXBkYXRlTWFya2VyU3RhdGUoKTtcblxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25fZGJsY2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy5tYXAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBlLmxhdGxuZztcblxuXHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHRMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbihlKTtcblxuXHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBsYXRsbmcgKTtcblx0XHRcdH0pXG5cdFx0XHQuZG91YmxlQ2xpY2tab29tLmRpc2FibGUoKTtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdhZGQtbWFya2VyLW9uLWRibGNsaWNrJylcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBMLkJyb3dzZXIucG9pbnRlciApIHtcblx0XHRcdFx0Ly8gdXNlIHBvaW50ZXIgZXZlbnRzXG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZF9wb2ludGVyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyB1c2UgdG91Y2ggZXZlbnRzXG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZF90b3VjaCgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2FkZC1tYXJrZXItb24tdGFwaG9sZCcpXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkX3BvaW50ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRfaG9sZF90aW1lb3V0ID0gNzUwLFxuXHRcdFx0XHRfaG9sZF93YWl0X3RvID0ge307XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwncG9pbnRlcmRvd24nLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0dmFyIGNwID0gc2VsZi5tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZSk7XG5cdFx0XHRcdFx0XHR2YXIgbHAgPSBzZWxmLm1hcC5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChjcClcblxuXHRcdFx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5tYXAubGF5ZXJQb2ludFRvTGF0TG5nKGxwKSApXG5cblx0XHRcdFx0XHRcdF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdID0gZmFsc2U7XG5cdFx0XHRcdFx0fSwgX2hvbGRfdGltZW91dCApO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksICdwb2ludGVydXAgcG9pbnRlcm1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHQhISBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSAmJiBjbGVhclRpbWVvdXQoIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZF90b3VjaDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0X2hvbGRfdGltZW91dCA9IDc1MCxcblx0XHRcdFx0X2hvbGRfd2FpdF90byA9IGZhbHNlO1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksJ3RvdWNoc3RhcnQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmICggZS50b3VjaGVzLmxlbmd0aCAhPT0gMSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0X2hvbGRfd2FpdF90byA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0dmFyIGNwID0gc2VsZi5tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZS50b3VjaGVzWzBdKTtcblx0XHRcdFx0XHRcdHZhciBscCA9IHNlbGYubWFwLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KGNwKVxuXG5cdFx0XHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLm1hcC5sYXllclBvaW50VG9MYXRMbmcobHApIClcblxuXHRcdFx0XHRcdFx0X2hvbGRfd2FpdF90byA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIF9ob2xkX3RpbWVvdXQgKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCAndG91Y2hlbmQgdG91Y2htb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0ISEgX2hvbGRfd2FpdF90byAmJiBjbGVhclRpbWVvdXQoIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0YWRkTWFya2VyQnlMYXRMbmc6ZnVuY3Rpb24obGF0bG5nKSB7XG5cdFx0XHR2YXIgY29sbGVjdGlvbiA9IHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksXG5cdFx0XHRcdG1vZGVsO1xuXHRcdFx0Ly8gbm8gbW9yZSBtYXJrZXJzXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb2xsZWN0aW9uLmxlbmd0aCA+PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bW9kZWwgPSBuZXcgb3NtLk1hcmtlckRhdGEoe1xuXHRcdFx0XHRsYWJlbDogJycsXG5cdFx0XHRcdGRlZmF1bHRfbGFiZWw6ICcnLFxuXHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG5cdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcblx0XHRcdFx0Z2VvY29kZTogW10sXG5cdFx0XHRcdHV1aWQ6IGFjZi51bmlxaWQoJ21hcmtlcl8nKSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gdHJ1ZTtcblx0XHRcdGNvbGxlY3Rpb24uYWRkKCBtb2RlbCApO1xuXHRcdFx0dGhpcy5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblxuXHRcdFx0YWNmLmRvQWN0aW9uKCdhY2Ytb3NtL2NyZWF0ZS1tYXJrZXInLCBtb2RlbCwgdGhpcy5maWVsZCApO1xuXHRcdFx0YWNmLmRvQWN0aW9uKCdhY2Ytb3NtL3VwZGF0ZS1tYXJrZXItbGF0bG5nJywgbW9kZWwsIHRoaXMuZmllbGQgKTtcblxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHRpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcblx0XHRcdH1cblx0XHRcdC8vIGFkZCBhbiBleHRyYSBjb250cm9sIHBhbmVsIHJlZ2lvbiBmb3Igb3V0IHNlYXJjaFxuIFx0XHRcdHRoaXMubWFwLl9jb250cm9sQ29ybmVyc1snYWJvdmUnXSA9ICRhYm92ZS5nZXQoMCk7XG5cbiBcdFx0XHR0aGlzLmdlb2NvZGVyID0gTC5Db250cm9sLmdlb2NvZGVyKHtcbiBcdFx0XHRcdGNvbGxhcHNlZDogZmFsc2UsXG4gXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuIFx0XHRcdFx0cGxhY2Vob2xkZXI6aTE4bi5zZWFyY2gsXG4gXHRcdFx0XHRlcnJvck1lc3NhZ2U6aTE4bi5ub3RoaW5nX2ZvdW5kLFxuIFx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG4gXHRcdFx0XHRzdWdnZXN0TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRzdWdnZXN0VGltZW91dDoyNTAsXG4gXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuIFx0XHRcdFx0ZGVmYXVsdE1hcmtHZW9jb2RlOmZhbHNlLFxuXHRcdFx0XHRnZW9jb2RlcjpMLkNvbnRyb2wuR2VvY29kZXIubm9taW5hdGltKHtcblx0XHRcdFx0XHRodG1sVGVtcGxhdGU6IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHRcdFx0XHRcdFx0dmFyIHBhcnRzID0gW10sXG5cdFx0XHRcdFx0XHRcdHRlbXBsYXRlQ29uZmlnID0ge1xuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRlOiAvXFx7KC4rPylcXH0vZ1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRhZGRyID0gXy5kZWZhdWx0cyggcmVzdWx0LmFkZHJlc3MsIHtcblx0XHRcdFx0XHRcdFx0XHRidWlsZGluZzonJyxcblx0XHRcdFx0XHRcdFx0XHRyb2FkOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhvdXNlX251bWJlcjonJyxcblxuXHRcdFx0XHRcdFx0XHRcdHBvc3Rjb2RlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGNpdHk6JycsXG5cdFx0XHRcdFx0XHRcdFx0dG93bjonJyxcblx0XHRcdFx0XHRcdFx0XHR2aWxsYWdlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhhbWxldDonJyxcblxuXHRcdFx0XHRcdFx0XHRcdHN0YXRlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGNvdW50cnk6JycsXG5cdFx0XHRcdFx0XHRcdH0gKTtcblxuXHRcdFx0XHRcdFx0cGFydHMucHVzaCggXy50ZW1wbGF0ZSggaTE4bi5hZGRyZXNzX2Zvcm1hdC5zdHJlZXQsIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LmNpdHksIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LmNvdW50cnksIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm4gcGFydHNcblx0XHRcdFx0XHRcdFx0Lm1hcCggZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsLnJlcGxhY2UoL1xccysvZywnICcpLnRyaW0oKSB9IClcblx0XHRcdFx0XHRcdFx0LmZpbHRlciggZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsICE9PSAnJyB9IClcblx0XHRcdFx0XHRcdFx0LmpvaW4oJywgJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG4gXHRcdFx0fSlcbiBcdFx0XHQub24oJ21hcmtnZW9jb2RlJyxmdW5jdGlvbihlKXtcbiBcdFx0XHRcdC8vIHNlYXJjaCByZXN1bHQgY2xpY2tcblxuIFx0XHRcdFx0dmFyIGxhdGxuZyA9ICBlLmdlb2NvZGUuY2VudGVyLFxuIFx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGgsXG4gXHRcdFx0XHRcdGxhYmVsID0gc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIFsgZS5nZW9jb2RlIF0sIGxhdGxuZyApLFxuIFx0XHRcdFx0XHRtYXJrZXJfZGF0YSA9IHtcbiBcdFx0XHRcdFx0XHRsYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuIFx0XHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcblx0XHRcdFx0XHRcdGdlb2NvZGU6IFtdLFxuIFx0XHRcdFx0XHR9LFxuIFx0XHRcdFx0XHRtb2RlbCxcblx0XHRcdFx0XHRtYXJrZXIsXG5cdFx0XHRcdFx0cHJldmlvdXNHZW9jb2RlID0gZmFsc2U7XG5cblx0XHRcdFx0Ly8gZ2V0dGluZyByaWQgb2YgdGhlIG1vZGFsIOKAkyAjMzVcblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5fY2xlYXJSZXN1bHRzKCk7XG5cdFx0XHRcdHNlbGYuZ2VvY29kZXIuX2lucHV0LnZhbHVlID0gJyc7XG5cblx0XHRcdFx0Ly8gbm8gbWFya2VycyAtIGp1c3QgYWRhcHQgbWFwIHZpZXdcbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblxuIFx0XHRcdFx0fVxuXG5cbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IGZhbHNlIHx8IGNvdW50X21hcmtlcnMgPCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0XHRtYXJrZXJfZGF0YS51dWlkID0gYWNmLnVuaXFpZCgnbWFya2VyXycpXG5cdFx0XHRcdFx0Ly8gaW5maW5pdGUgbWFya2VycyBvciBtYXJrZXJzIHN0aWxsIGluIHJhbmdlXG4gXHRcdFx0XHRcdG1hcmtlciA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9IGVsc2UgaWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMSApIHtcblx0XHRcdFx0XHQvLyBvbmUgbWFya2VyIG9ubHlcblx0XHRcdFx0XHRtYXJrZXIgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmF0KDApXG5cdFx0XHRcdFx0cHJldmlvdXNHZW9jb2RlID0gbWFya2VyLmdldCgnZ2VvY29kZScpXG4gXHRcdFx0XHRcdG1hcmtlci5zZXQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH1cblxuXHRcdFx0XHRhY2YuZG9BY3Rpb24oJ2FjZi1vc20vbWFya2VyLWdlb2NvZGUtcmVzdWx0JywgbWFya2VyLm1vZGVsLCBzZWxmLmZpZWxkLCBbIGUuZ2VvY29kZSBdLCBwcmV2aW91c0dlb2NvZGUgKTtcblxuIFx0XHRcdFx0c2VsZi5tYXAuc2V0VmlldyggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCkgKTsgLy8ga2VlcCB6b29tLCBtaWdodCBiZSBjb25mdXNpbmcgZWxzZVxuXG4gXHRcdFx0fSlcbiBcdFx0XHQuYWRkVG8oIHRoaXMubWFwICk7XG5cblx0XHQvLyBJc3N1ZSAjODcgLSA8YnV0dG9uPlRoaXMgaXMgbm90IGEgYnV0dG9uPC9idXR0b24+XG5cdFx0TC5Eb21FdmVudC5vbiggXG5cdFx0XHR0aGlzLmdlb2NvZGVyLmdldENvbnRhaW5lcigpLnF1ZXJ5U2VsZWN0b3IoJy5sZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItaWNvbicpLCBcblx0XHRcdCdjbGljaycsIFxuXHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9zZWxlY3Rpb24pIHtcblx0XHRcdFx0XHR2YXIgaW5kZXggPSBwYXJzZUludCh0aGlzLl9zZWxlY3Rpb24uZ2V0QXR0cmlidXRlKCdkYXRhLXJlc3VsdC1pbmRleCcpLCAxMCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dGhpcy5fZ2VvY29kZVJlc3VsdFNlbGVjdGVkKHRoaXMuX3Jlc3VsdHNbaW5kZXhdKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0aGlzLl9jbGVhclJlc3VsdHMoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLl9nZW9jb2RlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIFxuXHRcdFx0dGhpcy5nZW9jb2RlciBcblx0XHQpXG5cbi8qXG5cbiovXG5jb25zb2xlLmxvZyh0aGlzLmdlb2NvZGVyKVxuIFx0XHR9LFxuXHRcdHJldmVyc2VHZW9jb2RlOmZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0bGF0bG5nID0geyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9O1xuXHRcdFx0dGhpcy5nZW9jb2Rlci5vcHRpb25zLmdlb2NvZGVyLnJldmVyc2UoXG5cdFx0XHRcdGxhdGxuZyxcblx0XHRcdFx0c2VsZi5tYXAuZ2V0Wm9vbSgpLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICpcdEBwYXJhbSBhcnJheSByZXN1bHRzXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRmdW5jdGlvbiggcmVzdWx0cyApIHtcblx0XHRcdFx0XHRhY2YuZG9BY3Rpb24oJ2FjZi1vc20vbWFya2VyLWdlb2NvZGUtcmVzdWx0JywgbW9kZWwsIHNlbGYuZmllbGQsIHJlc3VsdHMsIG1vZGVsLmdldCgnZ2VvY29kZScgKSApO1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZ2VvY29kZScsIHJlc3VsdHMgKTtcblx0XHRcdFx0XHRtb2RlbC5zZXQoJ2RlZmF1bHRfbGFiZWwnLCBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggcmVzdWx0cywgbGF0bG5nICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9LFxuXHRcdHBhcnNlR2VvY29kZVJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdHMsIGxhdGxuZyApIHtcblx0XHRcdHZhciBsYWJlbCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoICEgcmVzdWx0cy5sZW5ndGggKSB7XG5cdFx0XHRcdGxhYmVsID0gbGF0bG5nLmxhdCArICcsICcgKyBsYXRsbmcubG5nO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JC5lYWNoKCByZXN1bHRzLCBmdW5jdGlvbiggaSwgcmVzdWx0ICkge1xuXG5cdFx0XHRcdFx0bGFiZWwgPSByZXN1bHQuaHRtbDtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdC8vIHRyaW1cblx0XHRcdHJldHVybiBsYWJlbDtcblx0XHR9LFxuXG5cblxuXHRcdC8qKlxuXHRcdCAqXHRMYXllcnNcblx0IFx0Ki9cblx0XHRpbml0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IFtdLFxuXHRcdFx0XHRiYXNlTGF5ZXJzID0ge30sXG5cdFx0XHRcdG92ZXJsYXlzID0ge30sXG5cdFx0XHRcdGlzX29taXR0ZWQgPSBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4ga2V5ID09PSBudWxsIHx8ICggISEgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICYmIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBrZXkgKSA9PT0gLTEgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0dXBNYXAgPSBmdW5jdGlvbiggdmFsLCBrZXkgKXtcblx0XHRcdFx0XHR2YXIgbGF5ZXI7XG5cdFx0XHRcdFx0aWYgKCBfLmlzT2JqZWN0KHZhbCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJC5lYWNoKCB2YWwsIHNldHVwTWFwICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBpc19vbWl0dGVkKGtleSkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIGtleSAvKiwgbGF5ZXJfY29uZmlnLm9wdGlvbnMqLyApO1xuXHRcdFx0XHRcdH0gY2F0Y2goZXgpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGF5ZXIucHJvdmlkZXJLZXkgPSBrZXk7XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSgga2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYXNlTGF5ZXJzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGVjdGVkTGF5ZXJzLmluZGV4T2YoIGtleSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKTtcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0fTtcblxuIFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpOyAvLyBzaG91bGQgYmUgbGF5ZXIgc3RvcmUgdmFsdWVcblxuIFx0XHRcdC8vIGZpbHRlciBhdmFpYWxibGUgbGF5ZXJzIGluIGZpZWxkIHZhbHVlXG4gXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgIT09IGZhbHNlICYmIF8uaXNBcnJheSggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHNlbGVjdGVkTGF5ZXJzLmZpbHRlciggZnVuY3Rpb24oZWwpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBlbCApICE9PSAtMTtcbiBcdFx0XHRcdH0pO1xuIFx0XHRcdH1cblxuIFx0XHRcdC8vIHNldCBkZWZhdWx0IGxheWVyXG4gXHRcdFx0aWYgKCAhIHNlbGVjdGVkTGF5ZXJzLmxlbmd0aCApIHtcblxuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuc2xpY2UoIDAsIDEgKTtcblxuIFx0XHRcdH1cblxuIFx0XHRcdC8vIGVkaXRhYmxlIGxheWVycyFcblxuXHRcdFx0dGhpcy5tYXAub24oICdiYXNlbGF5ZXJjaGFuZ2UgbGF5ZXJhZGQgbGF5ZXJyZW1vdmUnLCBmdW5jdGlvbihlKXtcblxuXHRcdFx0XHRpZiAoICEgZS5sYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGxheWVycyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikge1xuXHRcdFx0XHRcdGlmICggISBsYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSggbGF5ZXIucHJvdmlkZXJLZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRsYXllcnMucHVzaCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYXllcnMudW5zaGlmdCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF5ZXJzJywgbGF5ZXJzICk7XG5cdFx0XHR9ICk7XG5cbiBcdFx0XHQkLmVhY2goIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycywgc2V0dXBNYXAgKTtcblxuXHRcdFx0dGhpcy5sYXllcnNDb250cm9sID0gTC5jb250cm9sLmxheWVycyggYmFzZUxheWVycywgb3ZlcmxheXMsIHtcblx0XHRcdFx0Y29sbGFwc2VkOiB0cnVlLFxuXHRcdFx0XHRoaWRlU2luZ2xlQmFzZTogdHJ1ZSxcblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcbiBcdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcGF0dGVybnMgPSBbXG5cdFx0XHRcdCdeKE9wZW5XZWF0aGVyTWFwfE9wZW5TZWFNYXApJyxcblx0XHRcdFx0J09wZW5NYXBTdXJmZXIuKEh5YnJpZHxBZG1pbkJvdW5kc3xDb250b3VyTGluZXN8SGlsbHNoYWRlfEVsZW1lbnRzQXRSaXNrKScsXG5cdFx0XHRcdCdIaWtlQmlrZS5IaWxsU2hhZGluZycsXG5cdFx0XHRcdCdTdGFtZW4uKFRvbmVyfFRlcnJhaW4pKEh5YnJpZHxMaW5lc3xMYWJlbHMpJyxcblx0XHRcdFx0J1RvbVRvbS4oSHlicmlkfExhYmVscyknLFxuXHRcdFx0XHQnSHlkZGEuUm9hZHNBbmRMYWJlbHMnLFxuXHRcdFx0XHQnXkp1c3RpY2VNYXAnLFxuXHRcdFx0XHQnT3BlblB0TWFwJyxcblx0XHRcdFx0J09wZW5SYWlsd2F5TWFwJyxcblx0XHRcdFx0J09wZW5GaXJlTWFwJyxcblx0XHRcdFx0J1NhZmVDYXN0Jyxcblx0XHRcdFx0J09ubHlMYWJlbHMnLFxuXHRcdFx0XHQnSEVSRSh2Mz8pLnRyYWZmaWNGbG93Jyxcblx0XHRcdFx0J0hFUkUodjM/KS5tYXBMYWJlbHMnXG5cdFx0XHRdLmpvaW4oJ3wnKTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMgKyAnKScpICE9PSBudWxsO1xuXHRcdH0sXG5cdFx0cmVzZXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyByZW1vdmUgYWxsIG1hcCBsYXllcnNcblx0XHRcdHRoaXMubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcil7XG5cdFx0XHRcdGlmICggbGF5ZXIuY29uc3RydWN0b3IgPT09IEwuVGlsZUxheWVyLlByb3ZpZGVyICkge1xuXHRcdFx0XHRcdGxheWVyLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHQvLyByZW1vdmUgbGF5ZXIgY29udHJvbFxuXHRcdFx0ISEgdGhpcy5sYXllcnNDb250cm9sICYmIHRoaXMubGF5ZXJzQ29udHJvbC5yZW1vdmUoKVxuXHRcdH0sXG5cdFx0dXBkYXRlX3Zpc2libGU6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSA9PT0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnZpc2libGUgPSB0aGlzLiRlbC5pcygnOnZpc2libGUnKTtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdHRoaXMubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGluaXRfYWNmOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0dG9nZ2xlX2NiID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gbm8gY2hhbmdlXG5cdFx0XHRcdFx0c2VsZi51cGRhdGVfdmlzaWJsZSgpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHQvLyBleHBhbmQvY29sbGFwc2UgYWNmIHNldHRpbmdcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdzaG93JywgdG9nZ2xlX2NiICk7XG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnaGlkZScsIHRvZ2dsZV9jYiApO1xuXG5cdFx0XHQvLyBleHBhbmQgd3AgbWV0YWJveFxuXHRcdFx0JChkb2N1bWVudCkub24oJ3Bvc3Rib3gtdG9nZ2xlZCcsIHRvZ2dsZV9jYiApO1xuXHRcdFx0JChkb2N1bWVudCkub24oJ2NsaWNrJywnLndpZGdldC10b3AgKicsIHRvZ2dsZV9jYiApO1xuXG5cdFx0fSxcblx0XHR1cGRhdGVfbWFwOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhdGxuZyA9IHsgbGF0OiB0aGlzLm1vZGVsLmdldCgnbGF0JyksIGxuZzogdGhpcy5tb2RlbC5nZXQoJ2xuZycpIH1cblx0XHRcdHRoaXMubWFwLnNldFZpZXcoXG5cdFx0XHRcdGxhdGxuZyxcblx0XHRcdFx0dGhpcy5tb2RlbC5nZXQoJ3pvb20nKVxuXHRcdFx0KTtcblx0XHR9XG5cdH0pO1xuXG5cblx0JChkb2N1bWVudClcblx0XHQub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGlmICggISBMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIgKSB7XG5cdFx0XHRcdEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlciA9IEwuQ29udHJvbC5leHRlbmQoe1xuXHRcdFx0XHRcdG9uQWRkOmZ1bmN0aW9uKCkge1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9jb250YWluZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuXHRcdFx0XHRcdFx0XHQnbGVhZmxldC1jb250cm9sLWFkZC1sb2NhdGlvbi1tYXJrZXIgbGVhZmxldC1iYXIgbGVhZmxldC1jb250cm9sJyk7XG5cblx0XHRcdFx0XHRcdHRoaXMuX2xpbmsgPSBMLkRvbVV0aWwuY3JlYXRlKCdhJywgJ2xlYWZsZXQtYmFyLXBhcnQgbGVhZmxldC1iYXItcGFydC1zaW5nbGUnLCB0aGlzLl9jb250YWluZXIpO1xuXHRcdFx0XHRcdFx0dGhpcy5fbGluay50aXRsZSA9IGkxOG4uYWRkX21hcmtlcl9hdF9sb2NhdGlvbjtcblx0XHRcdFx0XHRcdHRoaXMuX2ljb24gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2Rhc2hpY29ucyBkYXNoaWNvbnMtbG9jYXRpb24nLCB0aGlzLl9saW5rKTtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbilcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIHRoaXMub3B0aW9ucy5jYWxsYmFjaywgdGhpcylcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbik7XG5cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXI7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblJlbW92ZTpmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRpZiAoICEgTC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2wgKSB7XG5cdFx0XHRcdEwuQ29udHJvbC5GaXRCb3VuZHNDb250cm9sID0gTC5Db250cm9sLmV4dGVuZCh7XG5cdFx0XHRcdFx0b25BZGQ6ZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXG5cdFx0XHRcdFx0XHRcdCdsZWFmbGV0LWNvbnRyb2wtZml0LWJvdW5kcyBsZWFmbGV0LWJhciBsZWFmbGV0LWNvbnRyb2wnKTtcblxuXHRcdFx0XHRcdFx0dGhpcy5fbGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCAnbGVhZmxldC1iYXItcGFydCBsZWFmbGV0LWJhci1wYXJ0LXNpbmdsZScsIHRoaXMuX2NvbnRhaW5lciApO1xuXHRcdFx0XHRcdFx0dGhpcy5fbGluay50aXRsZSA9IGkxOG4uZml0X21hcmtlcnNfaW5fdmlldztcblx0XHRcdFx0XHRcdHRoaXMuX2ljb24gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2Rhc2hpY29ucyBkYXNoaWNvbnMtZWRpdG9yLWV4cGFuZCcsIHRoaXMuX2xpbmsgKTtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzIClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25SZW1vdmU6ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIHRoaXMub3B0aW9ucy5jYWxsYmFjaywgdGhpcyApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2RibGNsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXG5cdFx0XHQvLyBkb24ndCBpbml0IGluIHJlcGVhdGVyIHRlbXBsYXRlc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1pZD1cImFjZmNsb25laW5kZXhcIl0nKS5sZW5ndGggKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtaW5pdCcsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0dmFyIGVkaXRvciwgZmllbGQsXG5cdFx0XHRcdG1hcCA9IGUuZGV0YWlsLm1hcDtcblxuXHRcdFx0Ly8gd3JhcCBvc20uRmllbGQgYmFja2JvbmUgdmlldyBhcm91bmQgZWRpdG9yc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5pcygnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKSApIHtcblx0XHRcdFx0Ly8gZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdChmdW5jdGlvbiBjaGVja1Zpcygpe1xuXHRcdFx0XHRcdGlmICggISAkKGUudGFyZ2V0KS5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiBzZXRUaW1lb3V0KCBjaGVja1ZpcywgMjUwICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9KSgpO1xuXHRcdFx0XHRmaWVsZCA9IGFjZi5nZXRGaWVsZCggJChlLnRhcmdldCkuY2xvc2VzdCgnLmFjZi1maWVsZCcpIClcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogZmllbGQgfSApO1xuXHRcdFx0XHRmaWVsZC5zZXQoICdvc21FZGl0b3InLCBlZGl0b3IgKVxuXHRcdFx0XHQkKGUudGFyZ2V0KS5kYXRhKCAnX21hcF9lZGl0b3InLCBlZGl0b3IgKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2hvdyAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ3Nob3dfZmllbGQnLCBmdW5jdGlvbiggZmllbGQgKSB7XG5cblx0XHRpZiAoICdvcGVuX3N0cmVldF9tYXAnICE9PSBmaWVsZC50eXBlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0ICAgIHZhciBlZGl0b3IgPSBmaWVsZC4kZWwuZmluZCgnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKS5kYXRhKCAnX21hcF9lZGl0b3InICk7XG5cdCAgICBlZGl0b3IudXBkYXRlX3Zpc2libGUoKTtcblx0fSk7XG5cblx0YWNmLnJlZ2lzdGVyRmllbGRUeXBlKGFjZi5GaWVsZC5leHRlbmQoe1xuXHRcdHR5cGU6ICdvcGVuX3N0cmVldF9tYXAnXG5cdH0pKTtcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=

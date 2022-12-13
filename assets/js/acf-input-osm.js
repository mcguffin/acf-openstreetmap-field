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
					acf.doAction('acf-osm/create-marker', marker, self.field );

 				} else if ( self.config.max_markers === 1 ) {
					// one marker only
					marker = self.model.get('markers').at(0)
					previousGeocode = marker.get('geocode')
 					marker.set( marker_data );

 				}

				acf.doAction('acf-osm/marker-geocode-result', marker, self.field, [ e.geocode ], previousGeocode );

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
	acf.addAction( 'append', function( $el ){
		$el.length && $el.get(0).dispatchEvent( new CustomEvent('acf-osm-map-added') );	
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFjZi1pbnB1dC1vc20uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oICQsIGFyZywgZXhwb3J0cyApe1xuXHR2YXIgb3B0aW9ucyA9IGFyZy5vcHRpb25zLFxuXHRcdGkxOG4gPSBhcmcuaTE4bixcblx0XHRyZXN1bHRfdHBsID0gJzxkaXYgdGFiaW5kZXg9XCI8JT0gZGF0YS5pICU+XCIgY2xhc3M9XCJvc20tcmVzdWx0XCI+J1xuXHRcdFx0KyAnPCU9IGRhdGEucmVzdWx0X3RleHQgJT4nXG5cdFx0XHQrICc8YnIgLz48c21hbGw+PCU9IGRhdGEucHJvcGVydGllcy5vc21fdmFsdWUgJT48L3NtYWxsPidcblx0XHRcdCsgJzwvZGl2Pic7XG5cblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtID0ge1xuXHR9O1xuXG5cdHZhciBsb2NhdG9yQWRkQ29udHJvbCA9IG51bGw7XG5cblx0dmFyIGZpeGVkRmxvYXRHZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgZml4ZWRGbG9hdFNldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChwYXJzZUZsb2F0KHZhbHVlKS50b0ZpeGVkKGZpeCkgKTtcblx0XHR9XG5cdH1cblx0dmFyIGludEdldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRTZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHZhbHVlICk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIEdTTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG5cdFx0Z2V0OiBmdW5jdGlvbihhdHRyKSB7XG5cdFx0XHQvLyBDYWxsIHRoZSBnZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuZ2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0dGVyc1thdHRyXS5jYWxsKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGF0dHIpO1xuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcblx0XHRcdHZhciBhdHRycywgYXR0cjtcblxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBrZXktdmFsdWUgaW50byBhbiBvYmplY3Rcblx0XHRcdGlmIChfLmlzT2JqZWN0KGtleSkgfHwga2V5ID09IG51bGwpIHtcblx0XHRcdFx0YXR0cnMgPSBrZXk7XG5cdFx0XHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0dHJzID0ge307XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWx3YXlzIHBhc3MgYW4gb3B0aW9ucyBoYXNoIGFyb3VuZC4gVGhpcyBhbGxvd3MgbW9kaWZ5aW5nXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyBpbnNpZGUgdGhlIHNldHRlclxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRcdC8vIEdvIG92ZXIgYWxsIHRoZSBzZXQgYXR0cmlidXRlcyBhbmQgY2FsbCB0aGUgc2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0Zm9yIChhdHRyIGluIGF0dHJzKSB7XG5cdFx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5zZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRcdGF0dHJzW2F0dHJdID0gdGhpcy5zZXR0ZXJzW2F0dHJdLmNhbGwodGhpcywgYXR0cnNbYXR0cl0sIG9wdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cnMsIG9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRnZXR0ZXJzOiB7fSxcblxuXHRcdHNldHRlcnM6IHt9XG5cblx0fSk7XG5cblx0b3NtLk1hcmtlckRhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OiBmaXhlZEZsb2F0R2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOiBmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OiBmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOiBmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0aXNEZWZhdWx0TGFiZWw6ZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXQoJ2xhYmVsJykgPT09IHRoaXMuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdFx0bW9kZWw6IG9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXG5cblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OiBmaXhlZEZsb2F0R2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOiBmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTogaW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6IGZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6IGZpeGVkRmxvYXRTZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOiBpbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0XG5cdG9zbS5NYXJrZXJFbnRyeSA9IHdwLkJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0XHR0YWdOYW1lOiAnZGl2Jyxcblx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXInLFxuXHRcdHRlbXBsYXRlOndwLnRlbXBsYXRlKCdvc20tbWFya2VyLWlucHV0JyksXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cImxvY2F0ZS1tYXJrZXJcIl0nIDogJ2xvY2F0ZV9tYXJrZXInLFxuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJyZW1vdmUtbWFya2VyXCJdJyA6ICdyZW1vdmVfbWFya2VyJyxcblx0XHRcdCdjaGFuZ2UgW2RhdGEtbmFtZT1cImxhYmVsXCJdJ1x0XHQ6ICd1cGRhdGVfbWFya2VyX2xhYmVsJyxcbi8vXHRcdFx0J2ZvY3VzIFt0eXBlPVwidGV4dFwiXSdcdFx0XHRcdDogJ2hpbGl0ZV9tYXJrZXInXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG9wdCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHRoaXMubWFya2VyID0gb3B0Lm1hcmtlcjsgLy8gbGVhZmxldCBtYXJrZXJcblx0XHRcdHRoaXMubWFya2VyLm9zbV9jb250cm9sbGVyID0gdGhpcztcblx0XHRcdHRoaXMubW9kZWwgPSBvcHQubW9kZWw7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhYmVsJywgdGhpcy5jaGFuZ2VkTGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6ZGVmYXVsdF9sYWJlbCcsIHRoaXMuY2hhbmdlZERlZmF1bHRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXQnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bG5nJywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnZGVzdHJveScsIHRoaXMucmVtb3ZlICk7XG5cblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHRcdGFjZi5kb0FjdGlvbignYWNmLW9zbS91cGRhdGUtbWFya2VyLWxhdGxuZycsIHRoaXMubW9kZWwsIHRoaXMub3B0aW9ucy5jb250cm9sbGVyLmZpZWxkICk7XG5cdFx0fSxcblx0XHRyZW5kZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmhpbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC52YWwoIHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRzZWxmLmhpbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9sYWJlbDpmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSAkKGUudGFyZ2V0KS52YWwoKTtcblx0XHRcdGlmICggJycgPT09IGxhYmVsICkge1xuXHRcdFx0XHRsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCBsYWJlbCApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2dlb2NvZGU6ZnVuY3Rpb24oIGxhYmVsICkge1xuXG5cdFx0XHRpZiAoIHRoaXMubW9kZWwuaXNEZWZhdWx0TGFiZWwoKSApIHtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbHNcblx0XHRcdFx0dGhpcy5zZXRfbWFya2VyX2xhYmVsKCBsYWJlbCApO1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsIGlucHV0XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWdlb2NvZGVcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMuX3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXIoKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRfdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcjogZnVuY3Rpb24oICkge1xuXHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMubWFya2VyLmdldExhdExuZygpO1xuXHRcdFx0Lypcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhdFwiXScpLnZhbCggbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbG5nXCJdJykudmFsKCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYWJlbFwiXScpLnZhbCggdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0LyovXG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYWJlbCcsIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8vKi9cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aGlsaXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYWRkQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLnJlbW92ZUNsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2NhdGVfbWFya2VyOmZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLm1hcmtlci5fbWFwLmZseVRvKCB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKSApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRyZW1vdmVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdC8vIGNsaWNrIHJlbW92ZVxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dGhpcy5tb2RlbC5kZXN0cm95KCk7IC8vXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHBsaW5nOmZ1bmN0aW9uKCkge1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbikuaHRtbCgnJykuYXBwZW5kKCc8c3BhbiBjbGFzcz1cInBsaW5nXCI+PC9zcGFuPicpO1xuXHRcdH1cblx0fSk7XG5cblx0b3NtLkZpZWxkID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG5cdFx0bWFwOiBudWxsLFxuXHRcdGZpZWxkOiBudWxsLFxuXHRcdGdlb2NvZGVyOiBudWxsLFxuXHRcdGxvY2F0b3I6IG51bGwsXG5cdFx0dmlzaWJsZTogbnVsbCxcblx0XHQkcGFyZW50OmZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncywuYWNmLWZpZWxkLW9wZW4tc3RyZWV0LW1hcCcpXG5cdFx0fSxcblx0XHQkdmFsdWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJ2lucHV0Lm9zbS1qc29uJyk7XG5cdFx0fSxcblx0XHQkcmVzdWx0cyA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tcmVzdWx0cycpO1xuXHRcdH0sXG5cdFx0JG1hcmtlcnM6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcub3NtLW1hcmtlcnMnKTtcblx0XHR9LFxuXHRcdHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbiggZSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24oY29uZikge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGRhdGEgPSB0aGlzLmdldE1hcERhdGEoKTtcblxuXHRcdFx0dGhpcy5jb25maWdcdFx0PSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLm1hcFx0XHQ9IGNvbmYubWFwO1xuXG5cdFx0XHR0aGlzLmZpZWxkXHRcdD0gY29uZi5maWVsZDtcblxuXHRcdFx0dGhpcy5tb2RlbFx0XHQ9IG5ldyBvc20uTWFwRGF0YShkYXRhKTtcblxuXHRcdFx0dGhpcy5wbGluZ01hcmtlciA9IGZhbHNlO1xuXG5cdFx0XHR0aGlzLmluaXRfbG9jYXRvcl9hZGQoKTtcblxuXHRcdFx0dGhpcy5pbml0X2xvY2F0b3IoKTtcblxuXHRcdFx0Ly8gISEgb25seSBpZiBhKSBpbiBlZGl0b3IgJiYgYikgbWFya2VycyBhbGxvd2VkICEhXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzICE9PSAwICkge1xuXHRcdFx0XHR0aGlzLmluaXRfZml0X2JvdW5kcygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdGlmICggdGhpcy5jb25maWcuYWxsb3dfcHJvdmlkZXJzICkge1xuXHRcdFx0XHQvLyBwcmV2ZW50IGRlZmF1bHQgbGF5ZXIgY3JlYXRpb25cblx0XHRcdFx0dGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCAnYWNmLW9zbS1tYXAtY3JlYXRlLWxheWVycycsIHRoaXMucHJldmVudERlZmF1bHQgKVxuXG5cdFx0XHRcdHRoaXMuaW5pdExheWVycygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdhY2Ytb3NtLW1hcC1jcmVhdGUtbWFya2VycycsIHRoaXMucHJldmVudERlZmF1bHQgKVxuXHRcdFx0XG5cdFx0XHQvLyByZXNldCBtYXJrZXJzIGluIGNhc2UgZmllbGQgd2FzIGR1cGxpY2F0ZWQgd2l0aCBhIHJvd1xuXHRcdFx0c2VsZi4kbWFya2VycygpLmh0bWwoJycpXG5cdFx0XHR0aGlzLmluaXRNYXJrZXJzKCk7XG5cblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy5hZGRNYXJrZXIgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAncmVtb3ZlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdC8vdGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXllcnMnLCBjb25zb2xlLnRyYWNlICk7XG5cblx0XHRcdC8vIHVwZGF0ZSBvbiBtYXAgdmlldyBjaGFuZ2Vcblx0XHRcdHRoaXMubWFwLm9uKCd6b29tZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnem9vbScsc2VsZi5tYXAuZ2V0Wm9vbSgpKTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5tYXAub24oJ21vdmVlbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBzZWxmLm1hcC5nZXRDZW50ZXIoKTtcblxuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbGF0JyxsYXRsbmcubGF0ICk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsbmcnLGxhdGxuZy5sbmcgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV92aXNpYmxlKCk7XG5cblx0XHRcdHRoaXMudXBkYXRlX21hcCgpO1xuXG5cblx0XHRcdC8vIGtiIG5hdmlnYXRpb24gbWlnaHQgaW50ZXJmZXJlIHdpdGggb3RoZXIga2IgbGlzdGVuZXJzXG5cdFx0XHR0aGlzLm1hcC5rZXlib2FyZC5kaXNhYmxlKCk7XG5cblx0XHRcdGFjZi5hZGRBY3Rpb24oJ3JlbW91bnRfZmllbGQvdHlwZT1vcGVuX3N0cmVldF9tYXAnLCBmdW5jdGlvbihmaWVsZCl7XG5cdFx0XHRcdGlmICggc2VsZi5maWVsZCA9PT0gZmllbGQgKSB7XG5cdFx0XHRcdFx0c2VsZi5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9maXRfYm91bmRzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzXG5cdFx0XHQvLyAyZG86IGV4dGVybmFsaXplIEwuQ29udHJvbC5GaXRCb3VuZHNDb250cm9sXG5cdFx0XHR0aGlzLmZpdEJvdW5kc0NvbnRyb2wgPSBuZXcgTC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2woe1xuXHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbXJpZ2h0Jyxcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBtYXJrZXJzID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKVxuXHRcdFx0XHRcdHZhciBsbGIgPSBMLmxhdExuZ0JvdW5kcygpO1xuXHRcdFx0XHRcdGlmICggbWFya2Vycy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1hcmtlcnMuZm9yRWFjaCggZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdFx0XHRsbGIuZXh0ZW5kKEwubGF0TG5nKG1hcmtlci5nZXQoJ2xhdCcpLG1hcmtlci5nZXQoJ2xuZycpKSlcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRzZWxmLm1hcC5maXRCb3VuZHMobGxiKTtcblx0XHRcdFx0fVxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXG5cdFx0fSxcblx0XHRpbml0X2xvY2F0b3JfYWRkOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzXG5cblx0XHRcdHRoaXMubG9jYXRvckFkZCA9IG5ldyBMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIoe1xuXHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbWxlZnQnLFxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKCBzZWxmLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJykgPT09ICd0cnVlJyApIHtcblx0XHRcdFx0XHRcdHNlbGYuY3VycmVudExvY2F0aW9uICYmIHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYuY3VycmVudExvY2F0aW9uICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHNlbGYubG9jYXRvci5zdG9wKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXHRcdH0sXG5cdFx0aW5pdF9sb2NhdG9yOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy5jdXJyZW50TG9jYXRpb24gPSBmYWxzZTtcblxuXHRcdFx0dGhpcy5sb2NhdG9yID0gTC5jb250cm9sLmxvY2F0ZSh7XG5cdFx0XHQgICAgcG9zaXRpb246ICdib3R0b21sZWZ0Jyxcblx0XHRcdFx0aWNvbjogJ2Rhc2hpY29ucyBkYXNoaWNvbnMtbG9jYXRpb24tYWx0Jyxcblx0XHRcdFx0aWNvbkxvYWRpbmc6J3NwaW5uZXIgaXMtYWN0aXZlJyxcblx0XHRcdFx0Zmx5VG86dHJ1ZSxcblx0XHRcdCAgICBzdHJpbmdzOiB7XG5cdFx0XHQgICAgICAgIHRpdGxlOiBpMThuLm15X2xvY2F0aW9uXG5cdFx0XHQgICAgfSxcblx0XHRcdFx0b25Mb2NhdGlvbkVycm9yOmZ1bmN0aW9uKGVycikge31cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXG5cdFx0XHR0aGlzLm1hcC5vbignbG9jYXRpb25mb3VuZCcsZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0c2VsZi5jdXJyZW50TG9jYXRpb24gPSBlLmxhdGxuZztcblxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0c2VsZi5sb2NhdG9yLnN0b3BGb2xsb3dpbmcoKTtcblx0XHRcdFx0XHQkKHNlbGYubG9jYXRvci5faWNvbikucmVtb3ZlQ2xhc3MoJ2Rhc2hpY29ucy13YXJuaW5nJyk7XG5cdFx0XHRcdFx0Ly9zZWxmLmxvY2F0b3JBZGQuYWRkVG8oc2VsZi5tYXApXG5cdFx0XHRcdH0sMSk7XG5cdFx0XHR9KVxuXHRcdFx0dGhpcy5tYXAub24oJ2xvY2F0aW9uZXJyb3InLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0JChzZWxmLmxvY2F0b3IuX2ljb24pLmFkZENsYXNzKCdkYXNoaWNvbnMtd2FybmluZycpO1xuXHRcdFx0XHR9LDEpO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHRoaXMuJHZhbHVlKCkudmFsKCkgKTtcblx0XHRcdGRhdGEubGF0ID0gZGF0YS5sYXQgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbGF0Jyk7XG5cdFx0XHRkYXRhLmxuZyA9IGRhdGEubG5nIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxuZycpO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLXpvb20nKTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0dXBkYXRlVmFsdWU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiR2YWx1ZSgpLnZhbCggSlNPTi5zdHJpbmdpZnkoIHRoaXMubW9kZWwudG9KU09OKCkgKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0Ly90aGlzLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXHRcdH0sXG5cdFx0dXBkYXRlTWFya2VyU3RhdGU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGVuID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGg7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgISFsZW4gPyAndHJ1ZScgOiAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAoIGZhbHNlID09PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyB8fCBsZW4gPCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycykgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqXHRNYXJrZXJzXG5cdFx0ICovXG5cdFx0YWRkTWFya2VyOmZ1bmN0aW9uKCBtb2RlbCwgY29sbGVjdGlvbiApIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0Ly8gYWRkIG1hcmtlciB0byBtYXBcblx0XHRcdHZhciBtYXJrZXIgPSBMLm1hcmtlciggeyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9LCB7XG5cdFx0XHRcdFx0dGl0bGU6IG1vZGVsLmdldCgnbGFiZWwnKSxcblx0XHRcdFx0XHRpY29uOiB0aGlzLmljb24sXG5cdFx0XHRcdFx0ZHJhZ2dhYmxlOiB0cnVlXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5iaW5kVG9vbHRpcCggbW9kZWwuZ2V0KCdsYWJlbCcpICk7XG5cblx0XHRcdC8vXG5cdFx0XHR2YXIgZW50cnkgPSBuZXcgb3NtLk1hcmtlckVudHJ5KHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0bWFya2VyOiBtYXJrZXIsXG5cdFx0XHRcdG1vZGVsOiBtb2RlbFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubWFwLm9uY2UoJ2xheWVyYWRkJyxmdW5jdGlvbihlKXtcblxuXHRcdFx0XHRtYXJrZXJcblx0XHRcdFx0XHQub24oJ2NsaWNrJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdG1vZGVsLmRlc3Ryb3koKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5vbignZHJhZ2VuZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgbW9kZWwgbG5nbGF0XG5cdFx0XHRcdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5nZXRMYXRMbmcoKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUoIG1vZGVsICk7XG5cdFx0XHRcdFx0XHQvLyBnZW9jb2RlLCBnZXQgbGFiZWwsIHNldCBtb2RlbCBsYWJlbC4uLlxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0ZW50cnkuJGVsLmFwcGVuZFRvKCBzZWxmLiRtYXJrZXJzKCkgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtb2RlbC5vbiggJ2Rlc3Ryb3knLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0YWNmLmRvQWN0aW9uKCdhY2Ytb3NtL2Rlc3Ryb3ktbWFya2VyJywgbW9kZWwsIHNlbGYuZmllbGQgKTtcblx0XHRcdFx0bWFya2VyLnJlbW92ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1hcmtlci5hZGRUbyggdGhpcy5tYXAgKTtcblx0XHRcdGlmICggdGhpcy5wbGluZ01hcmtlciApIHtcblx0XHRcdFx0ZW50cnkucGxpbmcoKTtcblx0XHRcdH1cblxuXHRcdH0sXG5cdFx0aW5pdE1hcmtlcnM6ZnVuY3Rpb24oKXtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLmluaXRHZW9jb2RlKCk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJywgJ2ZhbHNlJyk7XG5cblx0XHRcdC8vIG5vIG1hcmtlcnMgYWxsb3dlZCFcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pY29uID0gbmV3IEwuRGl2SWNvbih7XG5cdFx0XHRcdGh0bWw6ICcnLFxuXHRcdFx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXItaWNvbidcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmZvckVhY2goIGZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdFx0c2VsZi5hZGRNYXJrZXIoIG1vZGVsICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdC8vIGRibHRhcCBpcyBub3QgZmlyaW5nIG9uIG1vYmlsZVxuXHRcdFx0aWYgKCBMLkJyb3dzZXIudG91Y2ggJiYgTC5Ccm93c2VyLm1vYmlsZSApIHtcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2RibGNsaWNrKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXBkYXRlTWFya2VyU3RhdGUoKTtcblxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25fZGJsY2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy5tYXAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBlLmxhdGxuZztcblxuXHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHRMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbihlKTtcblxuXHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBsYXRsbmcgKTtcblx0XHRcdH0pXG5cdFx0XHQuZG91YmxlQ2xpY2tab29tLmRpc2FibGUoKTtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdhZGQtbWFya2VyLW9uLWRibGNsaWNrJylcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBMLkJyb3dzZXIucG9pbnRlciApIHtcblx0XHRcdFx0Ly8gdXNlIHBvaW50ZXIgZXZlbnRzXG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZF9wb2ludGVyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyB1c2UgdG91Y2ggZXZlbnRzXG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZF90b3VjaCgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2FkZC1tYXJrZXItb24tdGFwaG9sZCcpXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkX3BvaW50ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRfaG9sZF90aW1lb3V0ID0gNzUwLFxuXHRcdFx0XHRfaG9sZF93YWl0X3RvID0ge307XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwncG9pbnRlcmRvd24nLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0dmFyIGNwID0gc2VsZi5tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZSk7XG5cdFx0XHRcdFx0XHR2YXIgbHAgPSBzZWxmLm1hcC5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChjcClcblxuXHRcdFx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5tYXAubGF5ZXJQb2ludFRvTGF0TG5nKGxwKSApXG5cblx0XHRcdFx0XHRcdF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdID0gZmFsc2U7XG5cdFx0XHRcdFx0fSwgX2hvbGRfdGltZW91dCApO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksICdwb2ludGVydXAgcG9pbnRlcm1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHQhISBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSAmJiBjbGVhclRpbWVvdXQoIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZF90b3VjaDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0X2hvbGRfdGltZW91dCA9IDc1MCxcblx0XHRcdFx0X2hvbGRfd2FpdF90byA9IGZhbHNlO1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksJ3RvdWNoc3RhcnQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmICggZS50b3VjaGVzLmxlbmd0aCAhPT0gMSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0X2hvbGRfd2FpdF90byA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0dmFyIGNwID0gc2VsZi5tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZS50b3VjaGVzWzBdKTtcblx0XHRcdFx0XHRcdHZhciBscCA9IHNlbGYubWFwLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KGNwKVxuXG5cdFx0XHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLm1hcC5sYXllclBvaW50VG9MYXRMbmcobHApIClcblxuXHRcdFx0XHRcdFx0X2hvbGRfd2FpdF90byA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIF9ob2xkX3RpbWVvdXQgKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCAndG91Y2hlbmQgdG91Y2htb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0ISEgX2hvbGRfd2FpdF90byAmJiBjbGVhclRpbWVvdXQoIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0YWRkTWFya2VyQnlMYXRMbmc6ZnVuY3Rpb24obGF0bG5nKSB7XG5cdFx0XHR2YXIgY29sbGVjdGlvbiA9IHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksXG5cdFx0XHRcdG1vZGVsO1xuXHRcdFx0Ly8gbm8gbW9yZSBtYXJrZXJzXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb2xsZWN0aW9uLmxlbmd0aCA+PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bW9kZWwgPSBuZXcgb3NtLk1hcmtlckRhdGEoe1xuXHRcdFx0XHRsYWJlbDogJycsXG5cdFx0XHRcdGRlZmF1bHRfbGFiZWw6ICcnLFxuXHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG5cdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcblx0XHRcdFx0Z2VvY29kZTogW10sXG5cdFx0XHRcdHV1aWQ6IGFjZi51bmlxaWQoJ21hcmtlcl8nKSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gdHJ1ZTtcblx0XHRcdGNvbGxlY3Rpb24uYWRkKCBtb2RlbCApO1xuXHRcdFx0dGhpcy5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblxuXHRcdFx0YWNmLmRvQWN0aW9uKCdhY2Ytb3NtL2NyZWF0ZS1tYXJrZXInLCBtb2RlbCwgdGhpcy5maWVsZCApO1xuXHRcdFx0YWNmLmRvQWN0aW9uKCdhY2Ytb3NtL3VwZGF0ZS1tYXJrZXItbGF0bG5nJywgbW9kZWwsIHRoaXMuZmllbGQgKTtcblxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHRpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcblx0XHRcdH1cblx0XHRcdC8vIGFkZCBhbiBleHRyYSBjb250cm9sIHBhbmVsIHJlZ2lvbiBmb3Igb3V0IHNlYXJjaFxuIFx0XHRcdHRoaXMubWFwLl9jb250cm9sQ29ybmVyc1snYWJvdmUnXSA9ICRhYm92ZS5nZXQoMCk7XG5cbiBcdFx0XHR0aGlzLmdlb2NvZGVyID0gTC5Db250cm9sLmdlb2NvZGVyKHtcbiBcdFx0XHRcdGNvbGxhcHNlZDogZmFsc2UsXG4gXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuIFx0XHRcdFx0cGxhY2Vob2xkZXI6aTE4bi5zZWFyY2gsXG4gXHRcdFx0XHRlcnJvck1lc3NhZ2U6aTE4bi5ub3RoaW5nX2ZvdW5kLFxuIFx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG4gXHRcdFx0XHRzdWdnZXN0TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRzdWdnZXN0VGltZW91dDoyNTAsXG4gXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuIFx0XHRcdFx0ZGVmYXVsdE1hcmtHZW9jb2RlOmZhbHNlLFxuXHRcdFx0XHRnZW9jb2RlcjpMLkNvbnRyb2wuR2VvY29kZXIubm9taW5hdGltKHtcblx0XHRcdFx0XHRodG1sVGVtcGxhdGU6IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHRcdFx0XHRcdFx0dmFyIHBhcnRzID0gW10sXG5cdFx0XHRcdFx0XHRcdHRlbXBsYXRlQ29uZmlnID0ge1xuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRlOiAvXFx7KC4rPylcXH0vZ1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRhZGRyID0gXy5kZWZhdWx0cyggcmVzdWx0LmFkZHJlc3MsIHtcblx0XHRcdFx0XHRcdFx0XHRidWlsZGluZzonJyxcblx0XHRcdFx0XHRcdFx0XHRyb2FkOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhvdXNlX251bWJlcjonJyxcblxuXHRcdFx0XHRcdFx0XHRcdHBvc3Rjb2RlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGNpdHk6JycsXG5cdFx0XHRcdFx0XHRcdFx0dG93bjonJyxcblx0XHRcdFx0XHRcdFx0XHR2aWxsYWdlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhhbWxldDonJyxcblxuXHRcdFx0XHRcdFx0XHRcdHN0YXRlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGNvdW50cnk6JycsXG5cdFx0XHRcdFx0XHRcdH0gKTtcblxuXHRcdFx0XHRcdFx0cGFydHMucHVzaCggXy50ZW1wbGF0ZSggaTE4bi5hZGRyZXNzX2Zvcm1hdC5zdHJlZXQsIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LmNpdHksIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LmNvdW50cnksIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm4gcGFydHNcblx0XHRcdFx0XHRcdFx0Lm1hcCggZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsLnJlcGxhY2UoL1xccysvZywnICcpLnRyaW0oKSB9IClcblx0XHRcdFx0XHRcdFx0LmZpbHRlciggZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsICE9PSAnJyB9IClcblx0XHRcdFx0XHRcdFx0LmpvaW4oJywgJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG4gXHRcdFx0fSlcbiBcdFx0XHQub24oJ21hcmtnZW9jb2RlJyxmdW5jdGlvbihlKXtcbiBcdFx0XHRcdC8vIHNlYXJjaCByZXN1bHQgY2xpY2tcblxuIFx0XHRcdFx0dmFyIGxhdGxuZyA9ICBlLmdlb2NvZGUuY2VudGVyLFxuIFx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGgsXG4gXHRcdFx0XHRcdGxhYmVsID0gc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIFsgZS5nZW9jb2RlIF0sIGxhdGxuZyApLFxuIFx0XHRcdFx0XHRtYXJrZXJfZGF0YSA9IHtcbiBcdFx0XHRcdFx0XHRsYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuIFx0XHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcblx0XHRcdFx0XHRcdGdlb2NvZGU6IFtdLFxuIFx0XHRcdFx0XHR9LFxuIFx0XHRcdFx0XHRtb2RlbCxcblx0XHRcdFx0XHRtYXJrZXIsXG5cdFx0XHRcdFx0cHJldmlvdXNHZW9jb2RlID0gZmFsc2U7XG5cblx0XHRcdFx0Ly8gZ2V0dGluZyByaWQgb2YgdGhlIG1vZGFsIOKAkyAjMzVcblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5fY2xlYXJSZXN1bHRzKCk7XG5cdFx0XHRcdHNlbGYuZ2VvY29kZXIuX2lucHV0LnZhbHVlID0gJyc7XG5cblx0XHRcdFx0Ly8gbm8gbWFya2VycyAtIGp1c3QgYWRhcHQgbWFwIHZpZXdcbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblxuIFx0XHRcdFx0fVxuXG5cbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IGZhbHNlIHx8IGNvdW50X21hcmtlcnMgPCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0XHRtYXJrZXJfZGF0YS51dWlkID0gYWNmLnVuaXFpZCgnbWFya2VyXycpXG5cdFx0XHRcdFx0Ly8gaW5maW5pdGUgbWFya2VycyBvciBtYXJrZXJzIHN0aWxsIGluIHJhbmdlXG4gXHRcdFx0XHRcdG1hcmtlciA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtYXJrZXJfZGF0YSApO1xuXHRcdFx0XHRcdGFjZi5kb0FjdGlvbignYWNmLW9zbS9jcmVhdGUtbWFya2VyJywgbWFya2VyLCBzZWxmLmZpZWxkICk7XG5cbiBcdFx0XHRcdH0gZWxzZSBpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSAxICkge1xuXHRcdFx0XHRcdC8vIG9uZSBtYXJrZXIgb25seVxuXHRcdFx0XHRcdG1hcmtlciA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYXQoMClcblx0XHRcdFx0XHRwcmV2aW91c0dlb2NvZGUgPSBtYXJrZXIuZ2V0KCdnZW9jb2RlJylcbiBcdFx0XHRcdFx0bWFya2VyLnNldCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fVxuXG5cdFx0XHRcdGFjZi5kb0FjdGlvbignYWNmLW9zbS9tYXJrZXItZ2VvY29kZS1yZXN1bHQnLCBtYXJrZXIsIHNlbGYuZmllbGQsIFsgZS5nZW9jb2RlIF0sIHByZXZpb3VzR2VvY29kZSApO1xuXG4gXHRcdFx0XHRzZWxmLm1hcC5zZXRWaWV3KCBsYXRsbmcsIHNlbGYubWFwLmdldFpvb20oKSApOyAvLyBrZWVwIHpvb20sIG1pZ2h0IGJlIGNvbmZ1c2luZyBlbHNlXG5cbiBcdFx0XHR9KVxuIFx0XHRcdC5hZGRUbyggdGhpcy5tYXAgKTtcblxuXHRcdFx0Ly8gSXNzdWUgIzg3IC0gPGJ1dHRvbj5UaGlzIGlzIG5vdCBhIGJ1dHRvbjwvYnV0dG9uPlxuXHRcdFx0TC5Eb21FdmVudC5vbiggXG5cdFx0XHRcdHRoaXMuZ2VvY29kZXIuZ2V0Q29udGFpbmVyKCkucXVlcnlTZWxlY3RvcignLmxlYWZsZXQtY29udHJvbC1nZW9jb2Rlci1pY29uJyksIFxuXHRcdFx0XHQnY2xpY2snLCBcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX3NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0dmFyIGluZGV4ID0gcGFyc2VJbnQodGhpcy5fc2VsZWN0aW9uLmdldEF0dHJpYnV0ZSgnZGF0YS1yZXN1bHQtaW5kZXgnKSwgMTApO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR0aGlzLl9nZW9jb2RlUmVzdWx0U2VsZWN0ZWQodGhpcy5fcmVzdWx0c1tpbmRleF0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR0aGlzLl9jbGVhclJlc3VsdHMoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5fZ2VvY29kZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgXG5cdFx0XHRcdHRoaXMuZ2VvY29kZXIgXG5cdFx0XHQpXG4gXHRcdH0sXG5cdFx0cmV2ZXJzZUdlb2NvZGU6ZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRsYXRsbmcgPSB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH07XG5cdFx0XHR0aGlzLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZShcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHRzZWxmLm1hcC5nZXRab29tKCksXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKlx0QHBhcmFtIGFycmF5IHJlc3VsdHNcblx0XHRcdFx0ICovXG5cdFx0XHRcdGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRcdFx0XHRcdGFjZi5kb0FjdGlvbignYWNmLW9zbS9tYXJrZXItZ2VvY29kZS1yZXN1bHQnLCBtb2RlbCwgc2VsZi5maWVsZCwgcmVzdWx0cywgbW9kZWwuZ2V0KCdnZW9jb2RlJyApICk7XG5cdFx0XHRcdFx0bW9kZWwuc2V0KCdnZW9jb2RlJywgcmVzdWx0cyApO1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZGVmYXVsdF9sYWJlbCcsIHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCByZXN1bHRzLCBsYXRsbmcgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cdFx0cGFyc2VHZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0cywgbGF0bG5nICkge1xuXHRcdFx0dmFyIGxhYmVsID0gZmFsc2U7XG5cblx0XHRcdGlmICggISByZXN1bHRzLmxlbmd0aCApIHtcblx0XHRcdFx0bGFiZWwgPSBsYXRsbmcubGF0ICsgJywgJyArIGxhdGxuZy5sbmc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIHJlc3VsdHMsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cblx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5odG1sO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHQgXHQqL1xuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG5cdFx0XHRcdGJhc2VMYXllcnMgPSB7fSxcblx0XHRcdFx0b3ZlcmxheXMgPSB7fSxcblx0XHRcdFx0aXNfb21pdHRlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBrZXkgPT09IG51bGwgfHwgKCAhISBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgJiYgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGtleSApID09PSAtMSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzZXR1cE1hcCA9IGZ1bmN0aW9uKCB2YWwsIGtleSApe1xuXHRcdFx0XHRcdHZhciBsYXllcjtcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBMLnRpbGVMYXllci5wcm92aWRlcigga2V5IC8qLCBsYXllcl9jb25maWcub3B0aW9ucyovICk7XG5cdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBrZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRvdmVybGF5c1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGJhc2VMYXllcnNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZWN0ZWRMYXllcnMuaW5kZXhPZigga2V5ICkgIT09IC0xICkge1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHR9O1xuXG4gXHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7IC8vIHNob3VsZCBiZSBsYXllciBzdG9yZSB2YWx1ZVxuXG4gXHRcdFx0Ly8gZmlsdGVyIGF2YWlhbGJsZSBsYXllcnMgaW4gZmllbGQgdmFsdWVcbiBcdFx0XHRpZiAoIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAhPT0gZmFsc2UgJiYgXy5pc0FycmF5KCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgKSApIHtcbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gc2VsZWN0ZWRMYXllcnMuZmlsdGVyKCBmdW5jdGlvbihlbCkge1xuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGVsICkgIT09IC0xO1xuIFx0XHRcdFx0fSk7XG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gc2V0IGRlZmF1bHQgbGF5ZXJcbiBcdFx0XHRpZiAoICEgc2VsZWN0ZWRMYXllcnMubGVuZ3RoICkge1xuXG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5zbGljZSggMCwgMSApO1xuXG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gZWRpdGFibGUgbGF5ZXJzIVxuXG5cdFx0XHR0aGlzLm1hcC5vbiggJ2Jhc2VsYXllcmNoYW5nZSBsYXllcmFkZCBsYXllcnJlbW92ZScsIGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdGlmICggISBlLmxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgbGF5ZXJzID0gW107XG5cblx0XHRcdFx0c2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0XHRcdFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBsYXllci5wcm92aWRlcktleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdGxheWVycy5wdXNoKCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxheWVycy51bnNoaWZ0KCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdsYXllcnMnLCBsYXllcnMgKTtcblx0XHRcdH0gKTtcblxuIFx0XHRcdCQuZWFjaCggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLCBzZXR1cE1hcCApO1xuXG5cdFx0XHR0aGlzLmxheWVyc0NvbnRyb2wgPSBMLmNvbnRyb2wubGF5ZXJzKCBiYXNlTGF5ZXJzLCBvdmVybGF5cywge1xuXHRcdFx0XHRjb2xsYXBzZWQ6IHRydWUsXG5cdFx0XHRcdGhpZGVTaW5nbGVCYXNlOiB0cnVlLFxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuIFx0XHR9LFxuXHRcdGxheWVyX2lzX292ZXJsYXk6IGZ1bmN0aW9uKCAga2V5LCBsYXllciApIHtcblxuXHRcdFx0aWYgKCBsYXllci5vcHRpb25zLm9wYWNpdHkgJiYgbGF5ZXIub3B0aW9ucy5vcGFjaXR5IDwgMSApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwYXR0ZXJucyA9IFtcblx0XHRcdFx0J14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci4oSHlicmlkfEFkbWluQm91bmRzfENvbnRvdXJMaW5lc3xIaWxsc2hhZGV8RWxlbWVudHNBdFJpc2spJyxcblx0XHRcdFx0J0hpa2VCaWtlLkhpbGxTaGFkaW5nJyxcblx0XHRcdFx0J1N0YW1lbi4oVG9uZXJ8VGVycmFpbikoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnVG9tVG9tLihIeWJyaWR8TGFiZWxzKScsXG5cdFx0XHRcdCdIeWRkYS5Sb2Fkc0FuZExhYmVscycsXG5cdFx0XHRcdCdeSnVzdGljZU1hcCcsXG5cdFx0XHRcdCdPcGVuUHRNYXAnLFxuXHRcdFx0XHQnT3BlblJhaWx3YXlNYXAnLFxuXHRcdFx0XHQnT3BlbkZpcmVNYXAnLFxuXHRcdFx0XHQnU2FmZUNhc3QnLFxuXHRcdFx0XHQnT25seUxhYmVscycsXG5cdFx0XHRcdCdIRVJFKHYzPykudHJhZmZpY0Zsb3cnLFxuXHRcdFx0XHQnSEVSRSh2Mz8pLm1hcExhYmVscydcblx0XHRcdF0uam9pbignfCcpO1xuXHRcdFx0cmV0dXJuIGtleS5tYXRjaCgnKCcgKyBwYXR0ZXJucyArICcpJykgIT09IG51bGw7XG5cdFx0fSxcblx0XHRyZXNldExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgbWFwIGxheWVyc1xuXHRcdFx0dGhpcy5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKXtcblx0XHRcdFx0aWYgKCBsYXllci5jb25zdHJ1Y3RvciA9PT0gTC5UaWxlTGF5ZXIuUHJvdmlkZXIgKSB7XG5cdFx0XHRcdFx0bGF5ZXIucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdC8vIHJlbW92ZSBsYXllciBjb250cm9sXG5cdFx0XHQhISB0aGlzLmxheWVyc0NvbnRyb2wgJiYgdGhpcy5sYXllcnNDb250cm9sLnJlbW92ZSgpXG5cdFx0fSxcblx0XHR1cGRhdGVfdmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlID09PSB0aGlzLiRlbC5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudmlzaWJsZSA9IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpO1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0dGhpcy5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9hY2Y6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0b2dnbGVfY2IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBubyBjaGFuZ2Vcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZV92aXNpYmxlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdC8vIGV4cGFuZC9jb2xsYXBzZSBhY2Ygc2V0dGluZ1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ3Nob3cnLCB0b2dnbGVfY2IgKTtcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdoaWRlJywgdG9nZ2xlX2NiICk7XG5cblx0XHRcdC8vIGV4cGFuZCB3cCBtZXRhYm94XG5cdFx0XHQkKGRvY3VtZW50KS5vbigncG9zdGJveC10b2dnbGVkJywgdG9nZ2xlX2NiICk7XG5cdFx0XHQkKGRvY3VtZW50KS5vbignY2xpY2snLCcud2lkZ2V0LXRvcCAqJywgdG9nZ2xlX2NiICk7XG5cblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXA6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0geyBsYXQ6IHRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiB0aGlzLm1vZGVsLmdldCgnbG5nJykgfVxuXHRcdFx0dGhpcy5tYXAuc2V0Vmlldyhcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHR0aGlzLm1vZGVsLmdldCgnem9vbScpXG5cdFx0XHQpO1xuXHRcdH1cblx0fSk7XG5cblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZScsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0aWYgKCAhIEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlciApIHtcblx0XHRcdFx0TC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyID0gTC5Db250cm9sLmV4dGVuZCh7XG5cdFx0XHRcdFx0b25BZGQ6ZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXG5cdFx0XHRcdFx0XHRcdCdsZWFmbGV0LWNvbnRyb2wtYWRkLWxvY2F0aW9uLW1hcmtlciBsZWFmbGV0LWJhciBsZWFmbGV0LWNvbnRyb2wnKTtcblxuXHRcdFx0XHRcdFx0dGhpcy5fbGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCAnbGVhZmxldC1iYXItcGFydCBsZWFmbGV0LWJhci1wYXJ0LXNpbmdsZScsIHRoaXMuX2NvbnRhaW5lcik7XG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rLnRpdGxlID0gaTE4bi5hZGRfbWFya2VyX2F0X2xvY2F0aW9uO1xuXHRcdFx0XHRcdFx0dGhpcy5faWNvbiA9IEwuRG9tVXRpbC5jcmVhdGUoJ3NwYW4nLCAnZGFzaGljb25zIGRhc2hpY29ucy1sb2NhdGlvbicsIHRoaXMuX2xpbmspO1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uUmVtb3ZlOmZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uICk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGlmICggISBMLkNvbnRyb2wuRml0Qm91bmRzQ29udHJvbCApIHtcblx0XHRcdFx0TC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2wgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRcdFx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0XHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1maXQtYm91bmRzIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyICk7XG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rLnRpdGxlID0gaTE4bi5maXRfbWFya2Vyc19pbl92aWV3O1xuXHRcdFx0XHRcdFx0dGhpcy5faWNvbiA9IEwuRG9tVXRpbC5jcmVhdGUoJ3NwYW4nLCAnZGFzaGljb25zIGRhc2hpY29ucy1lZGl0b3ItZXhwYW5kJywgdGhpcy5fbGluayApO1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uICk7XG5cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXI7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblJlbW92ZTpmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHR2YXIgZWRpdG9yLCBmaWVsZCxcblx0XHRcdFx0bWFwID0gZS5kZXRhaWwubWFwO1xuXG5cdFx0XHQvLyB3cmFwIG9zbS5GaWVsZCBiYWNrYm9uZSB2aWV3IGFyb3VuZCBlZGl0b3JzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmlzKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpICkge1xuXHRcdFx0XHQvLyBlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0KGZ1bmN0aW9uIGNoZWNrVmlzKCl7XG5cdFx0XHRcdFx0aWYgKCAhICQoZS50YXJnZXQpLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoIGNoZWNrVmlzLCAyNTAgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH0pKCk7XG5cdFx0XHRcdGZpZWxkID0gYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKVxuXHRcdFx0XHRlZGl0b3IgPSBuZXcgb3NtLkZpZWxkKCB7IGVsOiBlLnRhcmdldCwgbWFwOiBtYXAsIGZpZWxkOiBmaWVsZCB9ICk7XG5cdFx0XHRcdGZpZWxkLnNldCggJ29zbUVkaXRvcicsIGVkaXRvciApXG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgZ2V0IGxvYWRlZCAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ2FwcGVuZCcsIGZ1bmN0aW9uKCAkZWwgKXtcblx0XHQkZWwubGVuZ3RoICYmICRlbC5nZXQoMCkuZGlzcGF0Y2hFdmVudCggbmV3IEN1c3RvbUV2ZW50KCdhY2Ytb3NtLW1hcC1hZGRlZCcpICk7XHRcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2hvdyAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ3Nob3dfZmllbGQnLCBmdW5jdGlvbiggZmllbGQgKSB7XG5cblx0XHRpZiAoICdvcGVuX3N0cmVldF9tYXAnICE9PSBmaWVsZC50eXBlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0ICAgIHZhciBlZGl0b3IgPSBmaWVsZC4kZWwuZmluZCgnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKS5kYXRhKCAnX21hcF9lZGl0b3InICk7XG5cdCAgICBlZGl0b3IudXBkYXRlX3Zpc2libGUoKTtcblx0fSk7XG5cblx0YWNmLnJlZ2lzdGVyRmllbGRUeXBlKGFjZi5GaWVsZC5leHRlbmQoe1xuXHRcdHR5cGU6ICdvcGVuX3N0cmVldF9tYXAnXG5cdH0pKTtcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=

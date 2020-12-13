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
			lat:fixedFloatGetter( 'lat', options.accuracy ),
			lng:fixedFloatGetter( 'lng', options.accuracy ),
		},
		setters: {
			lat:fixedFloatSetter( 'lat', options.accuracy ),
			lng:fixedFloatSetter( 'lng', options.accuracy ),
		},
		isDefaultLabel:function() {
			return this.get('label') === this.get('default_label');
		}
	});
	osm.MarkerCollection = Backbone.Collection.extend({
		model:osm.MarkerData
	});


	osm.MapData = GSModel.extend({
		getters: {
			lat:fixedFloatGetter( 'lat', options.accuracy ),
			lng:fixedFloatGetter( 'lng', options.accuracy ),
			zoom:intGetter('zoom'),
		},
		setters: {
			lat:fixedFloatSetter( 'lat', options.accuracy ),
			lng:fixedFloatSetter( 'lng', options.accuracy ),
			zoom:intSetter('zoom'),
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

			this.locator = new L.control.locate({
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

			model.on('destroy',function(){
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
			});
			this.plingMarker = true;
			collection.add( model );
			this.reverseGeocode( model );
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
 						lng: latlng.lng
 					},
 					model;
				// getting rid of the modal – #35
				self.geocoder._clearResults();
				self.geocoder._input.value = '';

				// no markers - just adapt map view
 				if ( self.config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}


 				if ( self.config.max_markers === false || count_markers < self.config.max_markers ) {
					// infinite markers or markers still in range
 					self.model.get('markers').add( marker_data );

 				} else if ( self.config.max_markers === 1 ) {
					// one marker only
 					self.model.get('markers').at(0).set( marker_data );

 				}

 				self.map.setView( latlng, self.map.getZoom() ); // keep zoom, might be confusing else

 			})
 			.addTo( this.map );

 		},
		reverseGeocode:function( model ) {
			var self = this,
				latlng = { lat: model.get('lat'), lng: model.get('lng') };
			this.geocoder.options.geocoder.reverse(
				latlng,
				self.map.getZoom(),
				function( results ) {
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
			var editor,
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
				editor = new osm.Field( { el: e.target, map: map, field: acf.getField( $(e.target).closest('.acf-field') ) } );
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



})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cblx0dmFyIGxvY2F0b3JBZGRDb250cm9sID0gbnVsbDtcblxuXHR2YXIgZml4ZWRGbG9hdEdldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBmaXhlZEZsb2F0U2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoZml4KSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50R2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGludFNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdmFsdWUgKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgR1NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdC8vIENhbGwgdGhlIGdldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5nZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXR0ZXJzW2F0dHJdLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgYXR0cik7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0dmFyIGF0dHJzLCBhdHRyO1xuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGtleS12YWx1ZSBpbnRvIGFuIG9iamVjdFxuXHRcdFx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdFx0XHRhdHRycyA9IGtleTtcblx0XHRcdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXR0cnMgPSB7fTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHdheXMgcGFzcyBhbiBvcHRpb25zIGhhc2ggYXJvdW5kLiBUaGlzIGFsbG93cyBtb2RpZnlpbmdcblx0XHRcdC8vIHRoZSBvcHRpb25zIGluc2lkZSB0aGUgc2V0dGVyXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdFx0Ly8gR28gb3ZlciBhbGwgdGhlIHNldCBhdHRyaWJ1dGVzIGFuZCBjYWxsIHRoZSBzZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRmb3IgKGF0dHIgaW4gYXR0cnMpIHtcblx0XHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLnNldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdFx0YXR0cnNbYXR0cl0gPSB0aGlzLnNldHRlcnNbYXR0cl0uY2FsbCh0aGlzLCBhdHRyc1thdHRyXSwgb3B0aW9ucyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdldHRlcnM6IHt9LFxuXG5cdFx0c2V0dGVyczoge31cblxuXHR9KTtcblxuXHRvc20uTWFya2VyRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOm9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXG5cblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckVudHJ5ID0gd3AuQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0dGVtcGxhdGU6d3AudGVtcGxhdGUoJ29zbS1tYXJrZXItaW5wdXQnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwibG9jYXRlLW1hcmtlclwiXScgOiAnbG9jYXRlX21hcmtlcicsXG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cInJlbW92ZS1tYXJrZXJcIl0nIDogJ3JlbW92ZV9tYXJrZXInLFxuXHRcdFx0J2NoYW5nZSBbZGF0YS1uYW1lPVwibGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0KXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyOyAvLyBsZWFmbGV0IG1hcmtlclxuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5tb2RlbCA9IG9wdC5tb2RlbDtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGFiZWwnLCB0aGlzLmNoYW5nZWRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpkZWZhdWx0X2xhYmVsJywgdGhpcy5jaGFuZ2VkRGVmYXVsdExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUgKTtcblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJylcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gbGFiZWwgKSB7XG5cdFx0XHRcdGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5tb2RlbC5pc0RlZmF1bHRMYWJlbCgpICkge1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsc1xuXHRcdFx0XHR0aGlzLnNldF9tYXJrZXJfbGFiZWwoIGxhYmVsICk7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWwgaW5wdXRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItZ2VvY29kZVwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5fdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcigpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCk7XG5cdFx0XHQvKlxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGF0XCJdJykudmFsKCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sbmdcIl0nKS52YWwoIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhYmVsXCJdJykudmFsKCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvKi9cblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhYmVsJywgdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0Ly8qL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gY2xpY2sgcmVtb3ZlXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLm1vZGVsLmRlc3Ryb3koKTsgLy9cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cGxpbmc6ZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKS5odG1sKCcnKS5hcHBlbmQoJzxzcGFuIGNsYXNzPVwicGxpbmdcIj48L3NwYW4+Jyk7XG5cdFx0fVxuXHR9KTtcblxuXHRvc20uRmllbGQgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cblx0XHRtYXA6IG51bGwsXG5cdFx0ZmllbGQ6IG51bGwsXG5cdFx0Z2VvY29kZXI6IG51bGwsXG5cdFx0bG9jYXRvcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLmNvbmZpZ1x0XHQ9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuaW5pdF9sb2NhdG9yX2FkZCgpO1xuXG5cdFx0XHR0aGlzLmluaXRfbG9jYXRvcigpO1xuXG5cdFx0XHQvLyAhISBvbmx5IGlmIGEpIGluIGVkaXRvciAmJiBiKSBtYXJrZXJzIGFsbG93ZWQgISFcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgIT09IDAgKSB7XG5cdFx0XHRcdHRoaXMuaW5pdF9maXRfYm91bmRzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaW5pdF9hY2YoKTtcblxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5hbGxvd19wcm92aWRlcnMgKSB7XG5cdFx0XHRcdC8vIHByZXZlbnQgZGVmYXVsdCBsYXllciBjcmVhdGlvblxuXHRcdFx0XHR0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdhY2Ytb3NtLW1hcC1jcmVhdGUtbGF5ZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApXG5cblx0XHRcdFx0dGhpcy5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2FjZi1vc20tbWFwLWNyZWF0ZS1tYXJrZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcblx0XHRcdC8vIHJlc2V0IG1hcmtlcnMgaW4gY2FzZSBmaWVsZCB3YXMgZHVwbGljYXRlZCB3aXRoIGEgcm93XG5cdFx0XHRzZWxmLiRtYXJrZXJzKCkuaHRtbCgnJylcblx0XHRcdHRoaXMuaW5pdE1hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLmFkZE1hcmtlciApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdyZW1vdmUnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0Ly90aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxheWVycycsIGNvbnNvbGUudHJhY2UgKTtcblxuXHRcdFx0Ly8gdXBkYXRlIG9uIG1hcCB2aWV3IGNoYW5nZVxuXHRcdFx0dGhpcy5tYXAub24oJ3pvb21lbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCd6b29tJyxzZWxmLm1hcC5nZXRab29tKCkpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IHNlbGYubWFwLmdldENlbnRlcigpO1xuXG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsYXQnLGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xuZycsbGF0bG5nLmxuZyApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMudXBkYXRlX3Zpc2libGUoKTtcblxuXHRcdFx0dGhpcy51cGRhdGVfbWFwKCk7XG5cblxuXHRcdFx0Ly8ga2IgbmF2aWdhdGlvbiBtaWdodCBpbnRlcmZlcmUgd2l0aCBvdGhlciBrYiBsaXN0ZW5lcnNcblx0XHRcdHRoaXMubWFwLmtleWJvYXJkLmRpc2FibGUoKTtcblxuXHRcdFx0YWNmLmFkZEFjdGlvbigncmVtb3VudF9maWVsZC90eXBlPW9wZW5fc3RyZWV0X21hcCcsIGZ1bmN0aW9uKGZpZWxkKXtcblx0XHRcdFx0aWYgKCBzZWxmLmZpZWxkID09PSBmaWVsZCApIHtcblx0XHRcdFx0XHRzZWxmLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2ZpdF9ib3VuZHM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXNcblx0XHRcdC8vIDJkbzogZXh0ZXJuYWxpemUgTC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2xcblx0XHRcdHRoaXMuZml0Qm91bmRzQ29udHJvbCA9IG5ldyBMLkNvbnRyb2wuRml0Qm91bmRzQ29udHJvbCh7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tcmlnaHQnLFxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIG1hcmtlcnMgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpXG5cdFx0XHRcdFx0dmFyIGxsYiA9IEwubGF0TG5nQm91bmRzKCk7XG5cdFx0XHRcdFx0aWYgKCBtYXJrZXJzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFya2Vycy5mb3JFYWNoKCBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0XHRcdGxsYi5leHRlbmQoTC5sYXRMbmcobWFya2VyLmdldCgnbGF0JyksbWFya2VyLmdldCgnbG5nJykpKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHNlbGYubWFwLmZpdEJvdW5kcyhsbGIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG5cblx0XHR9LFxuXHRcdGluaXRfbG9jYXRvcl9hZGQ6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXNcblxuXHRcdFx0dGhpcy5sb2NhdG9yQWRkID0gbmV3IEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlcih7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tbGVmdCcsXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoIHNlbGYuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInKSA9PT0gJ3RydWUnICkge1xuXHRcdFx0XHRcdFx0c2VsZi5jdXJyZW50TG9jYXRpb24gJiYgc2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5jdXJyZW50TG9jYXRpb24gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c2VsZi5sb2NhdG9yLnN0b3AoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXG5cdFx0fSxcblx0XHRpbml0X2xvY2F0b3I6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLmN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHR0aGlzLmxvY2F0b3IgPSBuZXcgTC5jb250cm9sLmxvY2F0ZSh7XG5cdFx0XHQgICAgcG9zaXRpb246ICdib3R0b21sZWZ0Jyxcblx0XHRcdFx0aWNvbjogJ2Rhc2hpY29ucyBkYXNoaWNvbnMtbG9jYXRpb24tYWx0Jyxcblx0XHRcdFx0aWNvbkxvYWRpbmc6J3NwaW5uZXIgaXMtYWN0aXZlJyxcblx0XHRcdFx0Zmx5VG86dHJ1ZSxcblx0XHRcdCAgICBzdHJpbmdzOiB7XG5cdFx0XHQgICAgICAgIHRpdGxlOiBpMThuLm15X2xvY2F0aW9uXG5cdFx0XHQgICAgfSxcblx0XHRcdFx0b25Mb2NhdGlvbkVycm9yOmZ1bmN0aW9uKGVycikge31cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXG5cdFx0XHR0aGlzLm1hcC5vbignbG9jYXRpb25mb3VuZCcsZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0c2VsZi5jdXJyZW50TG9jYXRpb24gPSBlLmxhdGxuZztcblxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0c2VsZi5sb2NhdG9yLnN0b3BGb2xsb3dpbmcoKTtcblx0XHRcdFx0XHQkKHNlbGYubG9jYXRvci5faWNvbikucmVtb3ZlQ2xhc3MoJ2Rhc2hpY29ucy13YXJuaW5nJyk7XG5cdFx0XHRcdFx0Ly9zZWxmLmxvY2F0b3JBZGQuYWRkVG8oc2VsZi5tYXApXG5cdFx0XHRcdH0sMSk7XG5cdFx0XHR9KVxuXHRcdFx0dGhpcy5tYXAub24oJ2xvY2F0aW9uZXJyb3InLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0JChzZWxmLmxvY2F0b3IuX2ljb24pLmFkZENsYXNzKCdkYXNoaWNvbnMtd2FybmluZycpO1xuXHRcdFx0XHR9LDEpO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHRoaXMuJHZhbHVlKCkudmFsKCkgKTtcblx0XHRcdGRhdGEubGF0ID0gZGF0YS5sYXQgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbGF0Jyk7XG5cdFx0XHRkYXRhLmxuZyA9IGRhdGEubG5nIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxuZycpO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLXpvb20nKTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0dXBkYXRlVmFsdWU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiR2YWx1ZSgpLnZhbCggSlNPTi5zdHJpbmdpZnkoIHRoaXMubW9kZWwudG9KU09OKCkgKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0Ly90aGlzLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXHRcdH0sXG5cdFx0dXBkYXRlTWFya2VyU3RhdGU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGVuID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGg7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgISFsZW4gPyAndHJ1ZScgOiAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAoIGZhbHNlID09PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyB8fCBsZW4gPCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycykgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqXHRNYXJrZXJzXG5cdFx0ICovXG5cdFx0YWRkTWFya2VyOmZ1bmN0aW9uKCBtb2RlbCwgY29sbGVjdGlvbiApIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQvLyBhZGQgbWFya2VyIHRvIG1hcFxuXHRcdFx0dmFyIG1hcmtlciA9IEwubWFya2VyKCB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH0sIHtcblx0XHRcdFx0XHR0aXRsZTogbW9kZWwuZ2V0KCdsYWJlbCcpLFxuXHRcdFx0XHRcdGljb246IHRoaXMuaWNvbixcblx0XHRcdFx0XHRkcmFnZ2FibGU6IHRydWVcblx0XHRcdFx0fSlcblx0XHRcdFx0LmJpbmRUb29sdGlwKCBtb2RlbC5nZXQoJ2xhYmVsJykgKTtcblxuXHRcdFx0Ly9cblx0XHRcdHZhciBlbnRyeSA9IG5ldyBvc20uTWFya2VyRW50cnkoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRtYXJrZXI6IG1hcmtlcixcblx0XHRcdFx0bW9kZWw6IG1vZGVsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tYXAub25jZSgnbGF5ZXJhZGQnLGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdG1hcmtlclxuXHRcdFx0XHRcdC5vbignY2xpY2snLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0bW9kZWwuZGVzdHJveSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm9uKCdkcmFnZW5kJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBtb2RlbCBsbmdsYXRcblx0XHRcdFx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLmdldExhdExuZygpO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHRcdFx0XHRcdC8vIGdlb2NvZGUsIGdldCBsYWJlbCwgc2V0IG1vZGVsIGxhYmVsLi4uXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRlbnRyeS4kZWwuYXBwZW5kVG8oIHNlbGYuJG1hcmtlcnMoKSApO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1vZGVsLm9uKCdkZXN0cm95JyxmdW5jdGlvbigpe1xuXHRcdFx0XHRtYXJrZXIucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bWFya2VyLmFkZFRvKCB0aGlzLm1hcCApO1xuXHRcdFx0aWYgKCB0aGlzLnBsaW5nTWFya2VyICkge1xuXHRcdFx0XHRlbnRyeS5wbGluZygpO1xuXHRcdFx0fVxuXG5cdFx0fSxcblx0XHRpbml0TWFya2VyczpmdW5jdGlvbigpe1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuaW5pdEdlb2NvZGUoKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGFzLW1hcmtlcnMnLCAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAnZmFsc2UnKTtcblxuXHRcdFx0Ly8gbm8gbWFya2VycyBhbGxvd2VkIVxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmljb24gPSBuZXcgTC5EaXZJY29uKHtcblx0XHRcdFx0aHRtbDogJycsXG5cdFx0XHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlci1pY29uJ1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykuZm9yRWFjaCggZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0XHRzZWxmLmFkZE1hcmtlciggbW9kZWwgKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0Ly8gZGJsdGFwIGlzIG5vdCBmaXJpbmcgb24gbW9iaWxlXG5cdFx0XHRpZiAoIEwuQnJvd3Nlci50b3VjaCAmJiBMLkJyb3dzZXIubW9iaWxlICkge1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25fZGJsY2xpY2soKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9kYmxjbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLm1hcC5vbignZGJsY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IGUubGF0bG5nO1xuXG5cdFx0XHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cdFx0XHRcdEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKGUpO1xuXG5cdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIGxhdGxuZyApO1xuXHRcdFx0fSlcblx0XHRcdC5kb3VibGVDbGlja1pvb20uZGlzYWJsZSgpO1xuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2FkZC1tYXJrZXItb24tZGJsY2xpY2snKVxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIEwuQnJvd3Nlci5wb2ludGVyICkge1xuXHRcdFx0XHQvLyB1c2UgcG9pbnRlciBldmVudHNcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkX3BvaW50ZXIoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIHVzZSB0b3VjaCBldmVudHNcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkX3RvdWNoKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnYWRkLW1hcmtlci1vbi10YXBob2xkJylcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGRfcG9pbnRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdF9ob2xkX3RpbWVvdXQgPSA3NTAsXG5cdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSB7fTtcblx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCdwb2ludGVyZG93bicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0X2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHR2YXIgY3AgPSBzZWxmLm1hcC5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludChlKTtcblx0XHRcdFx0XHRcdHZhciBscCA9IHNlbGYubWFwLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KGNwKVxuXG5cdFx0XHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLm1hcC5sYXllclBvaW50VG9MYXRMbmcobHApIClcblxuXHRcdFx0XHRcdFx0X2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gPSBmYWxzZTtcblx0XHRcdFx0XHR9LCBfaG9sZF90aW1lb3V0ICk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwgJ3BvaW50ZXJ1cCBwb2ludGVybW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdCEhIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICYmIGNsZWFyVGltZW91dCggX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gKTtcblx0XHRcdFx0fSk7XG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkX3RvdWNoOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRfaG9sZF90aW1lb3V0ID0gNzUwLFxuXHRcdFx0XHRfaG9sZF93YWl0X3RvID0gZmFsc2U7XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwndG91Y2hzdGFydCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKCBlLnRvdWNoZXMubGVuZ3RoICE9PSAxICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRfaG9sZF93YWl0X3RvID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG5cdFx0XHRcdFx0XHR2YXIgY3AgPSBzZWxmLm1hcC5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludChlLnRvdWNoZXNbMF0pO1xuXHRcdFx0XHRcdFx0dmFyIGxwID0gc2VsZi5tYXAuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoY3ApXG5cblx0XHRcdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYubWFwLmxheWVyUG9pbnRUb0xhdExuZyhscCkgKVxuXG5cdFx0XHRcdFx0XHRfaG9sZF93YWl0X3RvID0gZmFsc2U7XG5cdFx0XHRcdFx0fSwgX2hvbGRfdGltZW91dCApO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksICd0b3VjaGVuZCB0b3VjaG1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHQhISBfaG9sZF93YWl0X3RvICYmIGNsZWFyVGltZW91dCggX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gKTtcblx0XHRcdFx0fSk7XG5cdFx0fSxcblx0XHRhZGRNYXJrZXJCeUxhdExuZzpmdW5jdGlvbihsYXRsbmcpIHtcblx0XHRcdHZhciBjb2xsZWN0aW9uID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSxcblx0XHRcdFx0bW9kZWw7XG5cdFx0XHQvLyBubyBtb3JlIG1hcmtlcnNcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgIT09IGZhbHNlICYmIGNvbGxlY3Rpb24ubGVuZ3RoID49IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRtb2RlbCA9IG5ldyBvc20uTWFya2VyRGF0YSh7XG5cdFx0XHRcdGxhYmVsOiAnJyxcblx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogJycsXG5cdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcblx0XHRcdFx0bG5nOiBsYXRsbmcubG5nLFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gdHJ1ZTtcblx0XHRcdGNvbGxlY3Rpb24uYWRkKCBtb2RlbCApO1xuXHRcdFx0dGhpcy5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqXHRHZW9jb2Rpbmdcblx0XHQgKlxuXHRcdCAqXHRAb24gbWFwLmxheWVyYWRkLCBsYXllci5kcmFnZW5kXG5cdFx0ICovXG5cdFx0aW5pdEdlb2NvZGU6ZnVuY3Rpb24oKSB7XG5cbiBcdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRhYm92ZSA9IHRoaXMuJGVsLnByZXYoKTtcblx0XHRcdGlmICggISAkYWJvdmUuaXMoICcuYWNmLW9zbS1hYm92ZScgKSApIHtcblx0XHRcdFx0JGFib3ZlID0gJCgnPGRpdiBjbGFzcz1cImFjZi1vc20tYWJvdmVcIj48L2Rpdj4nKS5pbnNlcnRCZWZvcmUoIHRoaXMuJGVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkYWJvdmUuaHRtbCgnJyk7XG5cdFx0XHR9XG5cdFx0XHQvLyBhZGQgYW4gZXh0cmEgY29udHJvbCBwYW5lbCByZWdpb24gZm9yIG91dCBzZWFyY2hcbiBcdFx0XHR0aGlzLm1hcC5fY29udHJvbENvcm5lcnNbJ2Fib3ZlJ10gPSAkYWJvdmUuZ2V0KDApO1xuXG4gXHRcdFx0dGhpcy5nZW9jb2RlciA9IEwuQ29udHJvbC5nZW9jb2Rlcih7XG4gXHRcdFx0XHRjb2xsYXBzZWQ6IGZhbHNlLFxuIFx0XHRcdFx0cG9zaXRpb246J2Fib3ZlJyxcbiBcdFx0XHRcdHBsYWNlaG9sZGVyOmkxOG4uc2VhcmNoLFxuIFx0XHRcdFx0ZXJyb3JNZXNzYWdlOmkxOG4ubm90aGluZ19mb3VuZCxcbiBcdFx0XHRcdHNob3dSZXN1bHRJY29uczp0cnVlLFxuIFx0XHRcdFx0c3VnZ2VzdE1pbkxlbmd0aDozLFxuIFx0XHRcdFx0c3VnZ2VzdFRpbWVvdXQ6MjUwLFxuIFx0XHRcdFx0cXVlcnlNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdGRlZmF1bHRNYXJrR2VvY29kZTpmYWxzZSxcblx0XHRcdFx0Z2VvY29kZXI6TC5Db250cm9sLkdlb2NvZGVyLm5vbWluYXRpbSh7XG5cdFx0XHRcdFx0aHRtbFRlbXBsYXRlOiBmdW5jdGlvbihyZXN1bHQpIHtcblx0XHRcdFx0XHRcdHZhciBwYXJ0cyA9IFtdLFxuXHRcdFx0XHRcdFx0XHR0ZW1wbGF0ZUNvbmZpZyA9IHtcblx0XHRcdFx0XHRcdFx0XHRpbnRlcnBvbGF0ZTogL1xceyguKz8pXFx9L2dcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0YWRkciA9IF8uZGVmYXVsdHMoIHJlc3VsdC5hZGRyZXNzLCB7XG5cdFx0XHRcdFx0XHRcdFx0YnVpbGRpbmc6JycsXG5cdFx0XHRcdFx0XHRcdFx0cm9hZDonJyxcblx0XHRcdFx0XHRcdFx0XHRob3VzZV9udW1iZXI6JycsXG5cblx0XHRcdFx0XHRcdFx0XHRwb3N0Y29kZTonJyxcblx0XHRcdFx0XHRcdFx0XHRjaXR5OicnLFxuXHRcdFx0XHRcdFx0XHRcdHRvd246JycsXG5cdFx0XHRcdFx0XHRcdFx0dmlsbGFnZTonJyxcblx0XHRcdFx0XHRcdFx0XHRoYW1sZXQ6JycsXG5cblx0XHRcdFx0XHRcdFx0XHRzdGF0ZTonJyxcblx0XHRcdFx0XHRcdFx0XHRjb3VudHJ5OicnLFxuXHRcdFx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHRcdHBhcnRzLnB1c2goIF8udGVtcGxhdGUoIGkxOG4uYWRkcmVzc19mb3JtYXQuc3RyZWV0LCB0ZW1wbGF0ZUNvbmZpZyApKCBhZGRyICkgKTtcblxuXHRcdFx0XHRcdFx0cGFydHMucHVzaCggXy50ZW1wbGF0ZSggaTE4bi5hZGRyZXNzX2Zvcm1hdC5jaXR5LCB0ZW1wbGF0ZUNvbmZpZyApKCBhZGRyICkgKTtcblxuXHRcdFx0XHRcdFx0cGFydHMucHVzaCggXy50ZW1wbGF0ZSggaTE4bi5hZGRyZXNzX2Zvcm1hdC5jb3VudHJ5LCB0ZW1wbGF0ZUNvbmZpZyApKCBhZGRyICkgKTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHBhcnRzXG5cdFx0XHRcdFx0XHRcdC5tYXAoIGZ1bmN0aW9uKGVsKSB7IHJldHVybiBlbC5yZXBsYWNlKC9cXHMrL2csJyAnKS50cmltKCkgfSApXG5cdFx0XHRcdFx0XHRcdC5maWx0ZXIoIGZ1bmN0aW9uKGVsKSB7IHJldHVybiBlbCAhPT0gJycgfSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKCcsICcpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuIFx0XHRcdH0pXG4gXHRcdFx0Lm9uKCdtYXJrZ2VvY29kZScsZnVuY3Rpb24oZSl7XG4gXHRcdFx0XHQvLyBzZWFyY2ggcmVzdWx0IGNsaWNrXG4gXHRcdFx0XHR2YXIgbGF0bG5nID0gIGUuZ2VvY29kZS5jZW50ZXIsXG4gXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aCxcbiBcdFx0XHRcdFx0bGFiZWwgPSBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggWyBlLmdlb2NvZGUgXSwgbGF0bG5nICksXG4gXHRcdFx0XHRcdG1hcmtlcl9kYXRhID0ge1xuIFx0XHRcdFx0XHRcdGxhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRkZWZhdWx0X2xhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG4gXHRcdFx0XHRcdFx0bG5nOiBsYXRsbmcubG5nXG4gXHRcdFx0XHRcdH0sXG4gXHRcdFx0XHRcdG1vZGVsO1xuXHRcdFx0XHQvLyBnZXR0aW5nIHJpZCBvZiB0aGUgbW9kYWwg4oCTICMzNVxuXHRcdFx0XHRzZWxmLmdlb2NvZGVyLl9jbGVhclJlc3VsdHMoKTtcblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5faW5wdXQudmFsdWUgPSAnJztcblxuXHRcdFx0XHQvLyBubyBtYXJrZXJzIC0ganVzdCBhZGFwdCBtYXAgdmlld1xuIFx0XHRcdFx0aWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblxuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5tYXAuZml0Qm91bmRzKCBlLmdlb2NvZGUuYmJveCApO1xuXG4gXHRcdFx0XHR9XG5cblxuIFx0XHRcdFx0aWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gZmFsc2UgfHwgY291bnRfbWFya2VycyA8IHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRcdC8vIGluZmluaXRlIG1hcmtlcnMgb3IgbWFya2VycyBzdGlsbCBpbiByYW5nZVxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fSBlbHNlIGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDEgKSB7XG5cdFx0XHRcdFx0Ly8gb25lIG1hcmtlciBvbmx5XG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYXQoMCkuc2V0KCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9XG5cbiBcdFx0XHRcdHNlbGYubWFwLnNldFZpZXcoIGxhdGxuZywgc2VsZi5tYXAuZ2V0Wm9vbSgpICk7IC8vIGtlZXAgem9vbSwgbWlnaHQgYmUgY29uZnVzaW5nIGVsc2VcblxuIFx0XHRcdH0pXG4gXHRcdFx0LmFkZFRvKCB0aGlzLm1hcCApO1xuXG4gXHRcdH0sXG5cdFx0cmV2ZXJzZUdlb2NvZGU6ZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRsYXRsbmcgPSB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH07XG5cdFx0XHR0aGlzLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZShcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHRzZWxmLm1hcC5nZXRab29tKCksXG5cdFx0XHRcdGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZGVmYXVsdF9sYWJlbCcsIHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCByZXN1bHRzLCBsYXRsbmcgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cdFx0cGFyc2VHZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0cywgbGF0bG5nICkge1xuXHRcdFx0dmFyIGxhYmVsID0gZmFsc2U7XG5cblx0XHRcdGlmICggISByZXN1bHRzLmxlbmd0aCApIHtcblx0XHRcdFx0bGFiZWwgPSBsYXRsbmcubGF0ICsgJywgJyArIGxhdGxuZy5sbmc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIHJlc3VsdHMsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cblx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5odG1sO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHQgXHQqL1xuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG5cdFx0XHRcdGJhc2VMYXllcnMgPSB7fSxcblx0XHRcdFx0b3ZlcmxheXMgPSB7fSxcblx0XHRcdFx0aXNfb21pdHRlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBrZXkgPT09IG51bGwgfHwgKCAhISBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgJiYgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGtleSApID09PSAtMSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzZXR1cE1hcCA9IGZ1bmN0aW9uKCB2YWwsIGtleSApe1xuXHRcdFx0XHRcdHZhciBsYXllcjtcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBMLnRpbGVMYXllci5wcm92aWRlcigga2V5IC8qLCBsYXllcl9jb25maWcub3B0aW9ucyovICk7XG5cdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBrZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRvdmVybGF5c1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGJhc2VMYXllcnNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZWN0ZWRMYXllcnMuaW5kZXhPZigga2V5ICkgIT09IC0xICkge1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHR9O1xuXG4gXHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7IC8vIHNob3VsZCBiZSBsYXllciBzdG9yZSB2YWx1ZVxuXG4gXHRcdFx0Ly8gZmlsdGVyIGF2YWlhbGJsZSBsYXllcnMgaW4gZmllbGQgdmFsdWVcbiBcdFx0XHRpZiAoIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAhPT0gZmFsc2UgJiYgXy5pc0FycmF5KCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgKSApIHtcbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gc2VsZWN0ZWRMYXllcnMuZmlsdGVyKCBmdW5jdGlvbihlbCkge1xuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGVsICkgIT09IC0xO1xuIFx0XHRcdFx0fSk7XG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gc2V0IGRlZmF1bHQgbGF5ZXJcbiBcdFx0XHRpZiAoICEgc2VsZWN0ZWRMYXllcnMubGVuZ3RoICkge1xuXG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5zbGljZSggMCwgMSApO1xuXG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gZWRpdGFibGUgbGF5ZXJzIVxuXG5cdFx0XHR0aGlzLm1hcC5vbiggJ2Jhc2VsYXllcmNoYW5nZSBsYXllcmFkZCBsYXllcnJlbW92ZScsIGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdGlmICggISBlLmxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgbGF5ZXJzID0gW107XG5cblx0XHRcdFx0c2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0XHRcdFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBsYXllci5wcm92aWRlcktleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdGxheWVycy5wdXNoKCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxheWVycy51bnNoaWZ0KCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdsYXllcnMnLCBsYXllcnMgKTtcblx0XHRcdH0gKTtcblxuIFx0XHRcdCQuZWFjaCggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLCBzZXR1cE1hcCApO1xuXG5cdFx0XHR0aGlzLmxheWVyc0NvbnRyb2wgPSBMLmNvbnRyb2wubGF5ZXJzKCBiYXNlTGF5ZXJzLCBvdmVybGF5cywge1xuXHRcdFx0XHRjb2xsYXBzZWQ6IHRydWUsXG5cdFx0XHRcdGhpZGVTaW5nbGVCYXNlOiB0cnVlLFxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuIFx0XHR9LFxuXHRcdGxheWVyX2lzX292ZXJsYXk6IGZ1bmN0aW9uKCAga2V5LCBsYXllciApIHtcblxuXHRcdFx0aWYgKCBsYXllci5vcHRpb25zLm9wYWNpdHkgJiYgbGF5ZXIub3B0aW9ucy5vcGFjaXR5IDwgMSApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwYXR0ZXJucyA9IFtcblx0XHRcdFx0J14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci4oSHlicmlkfEFkbWluQm91bmRzfENvbnRvdXJMaW5lc3xIaWxsc2hhZGV8RWxlbWVudHNBdFJpc2spJyxcblx0XHRcdFx0J0hpa2VCaWtlLkhpbGxTaGFkaW5nJyxcblx0XHRcdFx0J1N0YW1lbi4oVG9uZXJ8VGVycmFpbikoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnVG9tVG9tLihIeWJyaWR8TGFiZWxzKScsXG5cdFx0XHRcdCdIeWRkYS5Sb2Fkc0FuZExhYmVscycsXG5cdFx0XHRcdCdeSnVzdGljZU1hcCcsXG5cdFx0XHRcdCdPcGVuUHRNYXAnLFxuXHRcdFx0XHQnT3BlblJhaWx3YXlNYXAnLFxuXHRcdFx0XHQnT3BlbkZpcmVNYXAnLFxuXHRcdFx0XHQnU2FmZUNhc3QnLFxuXHRcdFx0XHQnT25seUxhYmVscycsXG5cdFx0XHRcdCdIRVJFKHYzPykudHJhZmZpY0Zsb3cnLFxuXHRcdFx0XHQnSEVSRSh2Mz8pLm1hcExhYmVscydcblx0XHRcdF0uam9pbignfCcpO1xuXHRcdFx0cmV0dXJuIGtleS5tYXRjaCgnKCcgKyBwYXR0ZXJucyArICcpJykgIT09IG51bGw7XG5cdFx0fSxcblx0XHRyZXNldExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgbWFwIGxheWVyc1xuXHRcdFx0dGhpcy5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKXtcblx0XHRcdFx0aWYgKCBsYXllci5jb25zdHJ1Y3RvciA9PT0gTC5UaWxlTGF5ZXIuUHJvdmlkZXIgKSB7XG5cdFx0XHRcdFx0bGF5ZXIucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdC8vIHJlbW92ZSBsYXllciBjb250cm9sXG5cdFx0XHQhISB0aGlzLmxheWVyc0NvbnRyb2wgJiYgdGhpcy5sYXllcnNDb250cm9sLnJlbW92ZSgpXG5cdFx0fSxcblx0XHR1cGRhdGVfdmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlID09PSB0aGlzLiRlbC5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudmlzaWJsZSA9IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpO1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0dGhpcy5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9hY2Y6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0b2dnbGVfY2IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBubyBjaGFuZ2Vcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZV92aXNpYmxlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdC8vIGV4cGFuZC9jb2xsYXBzZSBhY2Ygc2V0dGluZ1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ3Nob3cnLCB0b2dnbGVfY2IgKTtcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdoaWRlJywgdG9nZ2xlX2NiICk7XG5cblx0XHRcdC8vIGV4cGFuZCB3cCBtZXRhYm94XG5cdFx0XHQkKGRvY3VtZW50KS5vbigncG9zdGJveC10b2dnbGVkJywgdG9nZ2xlX2NiICk7XG5cdFx0XHQkKGRvY3VtZW50KS5vbignY2xpY2snLCcud2lkZ2V0LXRvcCAqJywgdG9nZ2xlX2NiICk7XG5cblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXA6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0geyBsYXQ6IHRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiB0aGlzLm1vZGVsLmdldCgnbG5nJykgfVxuXHRcdFx0dGhpcy5tYXAuc2V0Vmlldyhcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHR0aGlzLm1vZGVsLmdldCgnem9vbScpXG5cdFx0XHQpO1xuXHRcdH1cblx0fSk7XG5cblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZScsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0aWYgKCAhIEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlciApIHtcblx0XHRcdFx0TC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyID0gTC5Db250cm9sLmV4dGVuZCh7XG5cdFx0XHRcdFx0b25BZGQ6ZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXG5cdFx0XHRcdFx0XHRcdCdsZWFmbGV0LWNvbnRyb2wtYWRkLWxvY2F0aW9uLW1hcmtlciBsZWFmbGV0LWJhciBsZWFmbGV0LWNvbnRyb2wnKTtcblxuXHRcdFx0XHRcdFx0dGhpcy5fbGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCAnbGVhZmxldC1iYXItcGFydCBsZWFmbGV0LWJhci1wYXJ0LXNpbmdsZScsIHRoaXMuX2NvbnRhaW5lcik7XG5cdFx0ICAgICAgICAgICAgICAgIHRoaXMuX2xpbmsudGl0bGUgPSBpMThuLmFkZF9tYXJrZXJfYXRfbG9jYXRpb247XG5cdFx0ICAgICAgICAgICAgICAgIHRoaXMuX2ljb24gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2Rhc2hpY29ucyBkYXNoaWNvbnMtbG9jYXRpb24nLCB0aGlzLl9saW5rKTtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbilcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIHRoaXMub3B0aW9ucy5jYWxsYmFjaywgdGhpcylcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbik7XG5cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXI7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblJlbW92ZTpmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0XHRpZiAoICEgTC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2wgKSB7XG5cdFx0XHRcdEwuQ29udHJvbC5GaXRCb3VuZHNDb250cm9sID0gTC5Db250cm9sLmV4dGVuZCh7XG5cdFx0XHRcdFx0b25BZGQ6ZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXG5cdFx0XHRcdFx0XHRcdCdsZWFmbGV0LWNvbnRyb2wtZml0LWJvdW5kcyBsZWFmbGV0LWJhciBsZWFmbGV0LWNvbnRyb2wnKTtcblxuXHRcdFx0XHRcdFx0dGhpcy5fbGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCAnbGVhZmxldC1iYXItcGFydCBsZWFmbGV0LWJhci1wYXJ0LXNpbmdsZScsIHRoaXMuX2NvbnRhaW5lciApO1xuXHRcdFx0XHRcdFx0dGhpcy5fbGluay50aXRsZSA9IGkxOG4uZml0X21hcmtlcnNfaW5fdmlldztcblx0XHRcdFx0XHRcdHRoaXMuX2ljb24gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2Rhc2hpY29ucyBkYXNoaWNvbnMtZWRpdG9yLWV4cGFuZCcsIHRoaXMuX2xpbmsgKTtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzIClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25SZW1vdmU6ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIHRoaXMub3B0aW9ucy5jYWxsYmFjaywgdGhpcyApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2RibGNsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXG5cdFx0XHQvLyBkb24ndCBpbml0IGluIHJlcGVhdGVyIHRlbXBsYXRlc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1pZD1cImFjZmNsb25laW5kZXhcIl0nKS5sZW5ndGggKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtaW5pdCcsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0dmFyIGVkaXRvcixcblx0XHRcdFx0bWFwID0gZS5kZXRhaWwubWFwO1xuXG5cdFx0XHQvLyB3cmFwIG9zbS5GaWVsZCBiYWNrYm9uZSB2aWV3IGFyb3VuZCBlZGl0b3JzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmlzKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpICkge1xuXHRcdFx0XHQvLyBlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0KGZ1bmN0aW9uIGNoZWNrVmlzKCl7XG5cdFx0XHRcdFx0aWYgKCAhICQoZS50YXJnZXQpLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoIGNoZWNrVmlzLCAyNTAgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH0pKCk7XG5cdFx0XHRcdGVkaXRvciA9IG5ldyBvc20uRmllbGQoIHsgZWw6IGUudGFyZ2V0LCBtYXA6IG1hcCwgZmllbGQ6IGFjZi5nZXRGaWVsZCggJChlLnRhcmdldCkuY2xvc2VzdCgnLmFjZi1maWVsZCcpICkgfSApO1xuXHRcdFx0XHQkKGUudGFyZ2V0KS5kYXRhKCAnX21hcF9lZGl0b3InLCBlZGl0b3IgKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2hvdyAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ3Nob3dfZmllbGQnLCBmdW5jdGlvbiggZmllbGQgKSB7XG5cblx0XHRpZiAoICdvcGVuX3N0cmVldF9tYXAnICE9PSBmaWVsZC50eXBlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0ICAgIHZhciBlZGl0b3IgPSBmaWVsZC4kZWwuZmluZCgnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKS5kYXRhKCAnX21hcF9lZGl0b3InICk7XG5cdCAgICBlZGl0b3IudXBkYXRlX3Zpc2libGUoKTtcblx0fSk7XG5cblxuXG59KSggalF1ZXJ5LCBhY2Zfb3NtX2FkbWluLCB3aW5kb3cgKTtcbiJdfQ==

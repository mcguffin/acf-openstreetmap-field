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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cblx0dmFyIGxvY2F0b3JBZGRDb250cm9sID0gbnVsbDtcblxuXHR2YXIgZml4ZWRGbG9hdEdldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBmaXhlZEZsb2F0U2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoZml4KSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50R2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGludFNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdmFsdWUgKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgR1NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdC8vIENhbGwgdGhlIGdldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5nZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXR0ZXJzW2F0dHJdLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgYXR0cik7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0dmFyIGF0dHJzLCBhdHRyO1xuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGtleS12YWx1ZSBpbnRvIGFuIG9iamVjdFxuXHRcdFx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdFx0XHRhdHRycyA9IGtleTtcblx0XHRcdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXR0cnMgPSB7fTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHdheXMgcGFzcyBhbiBvcHRpb25zIGhhc2ggYXJvdW5kLiBUaGlzIGFsbG93cyBtb2RpZnlpbmdcblx0XHRcdC8vIHRoZSBvcHRpb25zIGluc2lkZSB0aGUgc2V0dGVyXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdFx0Ly8gR28gb3ZlciBhbGwgdGhlIHNldCBhdHRyaWJ1dGVzIGFuZCBjYWxsIHRoZSBzZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRmb3IgKGF0dHIgaW4gYXR0cnMpIHtcblx0XHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLnNldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdFx0YXR0cnNbYXR0cl0gPSB0aGlzLnNldHRlcnNbYXR0cl0uY2FsbCh0aGlzLCBhdHRyc1thdHRyXSwgb3B0aW9ucyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdldHRlcnM6IHt9LFxuXG5cdFx0c2V0dGVyczoge31cblxuXHR9KTtcblxuXHRvc20uTWFya2VyRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOm9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXG5cblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckVudHJ5ID0gd3AuQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0dGVtcGxhdGU6d3AudGVtcGxhdGUoJ29zbS1tYXJrZXItaW5wdXQnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwibG9jYXRlLW1hcmtlclwiXScgOiAnbG9jYXRlX21hcmtlcicsXG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cInJlbW92ZS1tYXJrZXJcIl0nIDogJ3JlbW92ZV9tYXJrZXInLFxuXHRcdFx0J2NoYW5nZSBbZGF0YS1uYW1lPVwibGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0KXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyOyAvLyBsZWFmbGV0IG1hcmtlclxuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5tb2RlbCA9IG9wdC5tb2RlbDtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGFiZWwnLCB0aGlzLmNoYW5nZWRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpkZWZhdWx0X2xhYmVsJywgdGhpcy5jaGFuZ2VkRGVmYXVsdExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUgKTtcblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJylcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gbGFiZWwgKSB7XG5cdFx0XHRcdGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5tb2RlbC5pc0RlZmF1bHRMYWJlbCgpICkge1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsc1xuXHRcdFx0XHR0aGlzLnNldF9tYXJrZXJfbGFiZWwoIGxhYmVsICk7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWwgaW5wdXRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItZ2VvY29kZVwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5fdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcigpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCk7XG5cdFx0XHQvKlxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGF0XCJdJykudmFsKCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sbmdcIl0nKS52YWwoIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhYmVsXCJdJykudmFsKCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvKi9cblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhYmVsJywgdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0Ly8qL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gY2xpY2sgcmVtb3ZlXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLm1vZGVsLmRlc3Ryb3koKTsgLy9cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cGxpbmc6ZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKS5odG1sKCcnKS5hcHBlbmQoJzxzcGFuIGNsYXNzPVwicGxpbmdcIj48L3NwYW4+Jyk7XG5cdFx0fVxuXHR9KTtcblxuXHRvc20uRmllbGQgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cblx0XHRtYXA6IG51bGwsXG5cdFx0ZmllbGQ6IG51bGwsXG5cdFx0Z2VvY29kZXI6IG51bGwsXG5cdFx0bG9jYXRvcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLmNvbmZpZ1x0XHQ9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuaW5pdF9sb2NhdG9yX2FkZCgpO1xuXG5cdFx0XHR0aGlzLmluaXRfbG9jYXRvcigpO1xuXG5cdFx0XHQvLyAhISBvbmx5IGlmIGEpIGluIGVkaXRvciAmJiBiKSBtYXJrZXJzIGFsbG93ZWQgISFcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgIT09IDAgKSB7XG5cdFx0XHRcdHRoaXMuaW5pdF9maXRfYm91bmRzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaW5pdF9hY2YoKTtcblxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5hbGxvd19wcm92aWRlcnMgKSB7XG5cdFx0XHRcdC8vIHByZXZlbnQgZGVmYXVsdCBsYXllciBjcmVhdGlvblxuXHRcdFx0XHR0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdhY2Ytb3NtLW1hcC1jcmVhdGUtbGF5ZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApXG5cblx0XHRcdFx0dGhpcy5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2FjZi1vc20tbWFwLWNyZWF0ZS1tYXJrZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcblx0XHRcdC8vIHJlc2V0IG1hcmtlcnMgaW4gY2FzZSBmaWVsZCB3YXMgZHVwbGljYXRlZCB3aXRoIGEgcm93XG5cdFx0XHRzZWxmLiRtYXJrZXJzKCkuaHRtbCgnJylcblx0XHRcdHRoaXMuaW5pdE1hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLmFkZE1hcmtlciApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdyZW1vdmUnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0Ly90aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxheWVycycsIGNvbnNvbGUudHJhY2UgKTtcblxuXHRcdFx0Ly8gdXBkYXRlIG9uIG1hcCB2aWV3IGNoYW5nZVxuXHRcdFx0dGhpcy5tYXAub24oJ3pvb21lbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCd6b29tJyxzZWxmLm1hcC5nZXRab29tKCkpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IHNlbGYubWFwLmdldENlbnRlcigpO1xuXG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsYXQnLGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xuZycsbGF0bG5nLmxuZyApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMudXBkYXRlX3Zpc2libGUoKTtcblxuXHRcdFx0dGhpcy51cGRhdGVfbWFwKCk7XG5cblxuXHRcdFx0Ly8ga2IgbmF2aWdhdGlvbiBtaWdodCBpbnRlcmZlcmUgd2l0aCBvdGhlciBrYiBsaXN0ZW5lcnNcblx0XHRcdHRoaXMubWFwLmtleWJvYXJkLmRpc2FibGUoKTtcblxuXHRcdFx0YWNmLmFkZEFjdGlvbigncmVtb3VudF9maWVsZC90eXBlPW9wZW5fc3RyZWV0X21hcCcsIGZ1bmN0aW9uKGZpZWxkKXtcblx0XHRcdFx0aWYgKCBzZWxmLmZpZWxkID09PSBmaWVsZCApIHtcblx0XHRcdFx0XHRzZWxmLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2ZpdF9ib3VuZHM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXNcblx0XHRcdC8vIDJkbzogZXh0ZXJuYWxpemUgTC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2xcblx0XHRcdHRoaXMuZml0Qm91bmRzQ29udHJvbCA9IG5ldyBMLkNvbnRyb2wuRml0Qm91bmRzQ29udHJvbCh7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tcmlnaHQnLFxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIG1hcmtlcnMgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpXG5cdFx0XHRcdFx0dmFyIGxsYiA9IEwubGF0TG5nQm91bmRzKCk7XG5cdFx0XHRcdFx0aWYgKCBtYXJrZXJzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFya2Vycy5mb3JFYWNoKCBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0XHRcdGxsYi5leHRlbmQoTC5sYXRMbmcobWFya2VyLmdldCgnbGF0JyksbWFya2VyLmdldCgnbG5nJykpKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHNlbGYubWFwLmZpdEJvdW5kcyhsbGIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG5cblx0XHR9LFxuXHRcdGluaXRfbG9jYXRvcl9hZGQ6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXNcblxuXHRcdFx0dGhpcy5sb2NhdG9yQWRkID0gbmV3IEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlcih7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tbGVmdCcsXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoIHNlbGYuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInKSA9PT0gJ3RydWUnICkge1xuXHRcdFx0XHRcdFx0c2VsZi5jdXJyZW50TG9jYXRpb24gJiYgc2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5jdXJyZW50TG9jYXRpb24gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c2VsZi5sb2NhdG9yLnN0b3AoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXG5cdFx0fSxcblx0XHRpbml0X2xvY2F0b3I6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLmN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHR0aGlzLmxvY2F0b3IgPSBMLmNvbnRyb2wubG9jYXRlKHtcblx0XHRcdCAgICBwb3NpdGlvbjogJ2JvdHRvbWxlZnQnLFxuXHRcdFx0XHRpY29uOiAnZGFzaGljb25zIGRhc2hpY29ucy1sb2NhdGlvbi1hbHQnLFxuXHRcdFx0XHRpY29uTG9hZGluZzonc3Bpbm5lciBpcy1hY3RpdmUnLFxuXHRcdFx0XHRmbHlUbzp0cnVlLFxuXHRcdFx0ICAgIHN0cmluZ3M6IHtcblx0XHRcdCAgICAgICAgdGl0bGU6IGkxOG4ubXlfbG9jYXRpb25cblx0XHRcdCAgICB9LFxuXHRcdFx0XHRvbkxvY2F0aW9uRXJyb3I6ZnVuY3Rpb24oZXJyKSB7fVxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXG5cblx0XHRcdHRoaXMubWFwLm9uKCdsb2NhdGlvbmZvdW5kJyxmdW5jdGlvbihlKXtcblxuXHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiA9IGUubGF0bG5nO1xuXG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzZWxmLmxvY2F0b3Iuc3RvcEZvbGxvd2luZygpO1xuXHRcdFx0XHRcdCQoc2VsZi5sb2NhdG9yLl9pY29uKS5yZW1vdmVDbGFzcygnZGFzaGljb25zLXdhcm5pbmcnKTtcblx0XHRcdFx0XHQvL3NlbGYubG9jYXRvckFkZC5hZGRUbyhzZWxmLm1hcClcblx0XHRcdFx0fSwxKTtcblx0XHRcdH0pXG5cdFx0XHR0aGlzLm1hcC5vbignbG9jYXRpb25lcnJvcicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuY3VycmVudExvY2F0aW9uID0gZmFsc2U7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHQkKHNlbGYubG9jYXRvci5faWNvbikuYWRkQ2xhc3MoJ2Rhc2hpY29ucy13YXJuaW5nJyk7XG5cdFx0XHRcdH0sMSk7XG5cdFx0XHR9KVxuXHRcdH0sXG5cdFx0Z2V0TWFwRGF0YTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0gSlNPTi5wYXJzZSggdGhpcy4kdmFsdWUoKS52YWwoKSApO1xuXHRcdFx0ZGF0YS5sYXQgPSBkYXRhLmxhdCB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sYXQnKTtcblx0XHRcdGRhdGEubG5nID0gZGF0YS5sbmcgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbG5nJyk7XG5cdFx0XHRkYXRhLnpvb20gPSBkYXRhLnpvb20gfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtem9vbScpO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHR1cGRhdGVWYWx1ZTpmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJHZhbHVlKCkudmFsKCBKU09OLnN0cmluZ2lmeSggdGhpcy5tb2RlbC50b0pTT04oKSApICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQvL3RoaXMuJGVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cdFx0XHR0aGlzLnVwZGF0ZU1hcmtlclN0YXRlKCk7XG5cdFx0fSxcblx0XHR1cGRhdGVNYXJrZXJTdGF0ZTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsZW4gPSB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aDtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGFzLW1hcmtlcnMnLCAhIWxlbiA/ICd0cnVlJyA6ICdmYWxzZScpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1jYW4tYWRkLW1hcmtlcicsICggZmFsc2UgPT09IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzIHx8IGxlbiA8IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzKSA/ICd0cnVlJyA6ICdmYWxzZScpO1xuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdE1hcmtlcnNcblx0XHQgKi9cblx0XHRhZGRNYXJrZXI6ZnVuY3Rpb24oIG1vZGVsLCBjb2xsZWN0aW9uICkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIGFkZCBtYXJrZXIgdG8gbWFwXG5cdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfSwge1xuXHRcdFx0XHRcdHRpdGxlOiBtb2RlbC5nZXQoJ2xhYmVsJyksXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5pY29uLFxuXHRcdFx0XHRcdGRyYWdnYWJsZTogdHJ1ZVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYmluZFRvb2x0aXAoIG1vZGVsLmdldCgnbGFiZWwnKSApO1xuXG5cdFx0XHQvL1xuXHRcdFx0dmFyIGVudHJ5ID0gbmV3IG9zbS5NYXJrZXJFbnRyeSh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdG1hcmtlcjogbWFya2VyLFxuXHRcdFx0XHRtb2RlbDogbW9kZWxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbmNlKCdsYXllcmFkZCcsZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0bWFya2VyXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHRtb2RlbC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQub24oJ2RyYWdlbmQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIG1vZGVsIGxuZ2xhdFxuXHRcdFx0XHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMuZ2V0TGF0TG5nKCk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHRcdFx0XHRzZWxmLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdFx0XHRcdFx0Ly8gZ2VvY29kZSwgZ2V0IGxhYmVsLCBzZXQgbW9kZWwgbGFiZWwuLi5cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdGVudHJ5LiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bW9kZWwub24oJ2Rlc3Ryb3knLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG1hcmtlci5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtYXJrZXIuYWRkVG8oIHRoaXMubWFwICk7XG5cdFx0XHRpZiAoIHRoaXMucGxpbmdNYXJrZXIgKSB7XG5cdFx0XHRcdGVudHJ5LnBsaW5nKCk7XG5cdFx0XHR9XG5cblx0XHR9LFxuXHRcdGluaXRNYXJrZXJzOmZ1bmN0aW9uKCl7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy5pbml0R2VvY29kZSgpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oYXMtbWFya2VycycsICdmYWxzZScpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1jYW4tYWRkLW1hcmtlcicsICdmYWxzZScpO1xuXG5cdFx0XHQvLyBubyBtYXJrZXJzIGFsbG93ZWQhXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaWNvbiA9IG5ldyBMLkRpdkljb24oe1xuXHRcdFx0XHRodG1sOiAnJyxcblx0XHRcdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyLWljb24nXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5mb3JFYWNoKCBmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHRcdHNlbGYuYWRkTWFya2VyKCBtb2RlbCApO1xuXHRcdFx0fSApO1xuXG5cdFx0XHQvLyBkYmx0YXAgaXMgbm90IGZpcmluZyBvbiBtb2JpbGVcblx0XHRcdGlmICggTC5Ccm93c2VyLnRvdWNoICYmIEwuQnJvd3Nlci5tb2JpbGUgKSB7XG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9kYmxjbGljaygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZU1hcmtlclN0YXRlKCk7XG5cblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2RibGNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMubWFwLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gZS5sYXRsbmc7XG5cblx0XHRcdFx0TC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdChlKTtcblx0XHRcdFx0TC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24oZSk7XG5cblx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggbGF0bG5nICk7XG5cdFx0XHR9KVxuXHRcdFx0LmRvdWJsZUNsaWNrWm9vbS5kaXNhYmxlKCk7XG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnYWRkLW1hcmtlci1vbi1kYmxjbGljaycpXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkOiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggTC5Ccm93c2VyLnBvaW50ZXIgKSB7XG5cdFx0XHRcdC8vIHVzZSBwb2ludGVyIGV2ZW50c1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGRfcG9pbnRlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gdXNlIHRvdWNoIGV2ZW50c1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGRfdG91Y2goKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdhZGQtbWFya2VyLW9uLXRhcGhvbGQnKVxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZF9wb2ludGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0X2hvbGRfdGltZW91dCA9IDc1MCxcblx0XHRcdFx0X2hvbGRfd2FpdF90byA9IHt9O1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksJ3BvaW50ZXJkb3duJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdHZhciBjcCA9IHNlbGYubWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUpO1xuXHRcdFx0XHRcdFx0dmFyIGxwID0gc2VsZi5tYXAuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoY3ApXG5cblx0XHRcdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYubWFwLmxheWVyUG9pbnRUb0xhdExuZyhscCkgKVxuXG5cdFx0XHRcdFx0XHRfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIF9ob2xkX3RpbWVvdXQgKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCAncG9pbnRlcnVwIHBvaW50ZXJtb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0ISEgX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gJiYgY2xlYXJUaW1lb3V0KCBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSApO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGRfdG91Y2g6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdF9ob2xkX3RpbWVvdXQgPSA3NTAsXG5cdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBmYWxzZTtcblx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCd0b3VjaHN0YXJ0JyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAoIGUudG91Y2hlcy5sZW5ndGggIT09IDEgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdHZhciBjcCA9IHNlbGYubWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUudG91Y2hlc1swXSk7XG5cdFx0XHRcdFx0XHR2YXIgbHAgPSBzZWxmLm1hcC5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChjcClcblxuXHRcdFx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5tYXAubGF5ZXJQb2ludFRvTGF0TG5nKGxwKSApXG5cblx0XHRcdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBmYWxzZTtcblx0XHRcdFx0XHR9LCBfaG9sZF90aW1lb3V0ICk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwgJ3RvdWNoZW5kIHRvdWNobW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdCEhIF9ob2xkX3dhaXRfdG8gJiYgY2xlYXJUaW1lb3V0KCBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSApO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdGFkZE1hcmtlckJ5TGF0TG5nOmZ1bmN0aW9uKGxhdGxuZykge1xuXHRcdFx0dmFyIGNvbGxlY3Rpb24gPSB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLFxuXHRcdFx0XHRtb2RlbDtcblx0XHRcdC8vIG5vIG1vcmUgbWFya2Vyc1xuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyAhPT0gZmFsc2UgJiYgY29sbGVjdGlvbi5sZW5ndGggPj0gdGhpcy5jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdG1vZGVsID0gbmV3IG9zbS5NYXJrZXJEYXRhKHtcblx0XHRcdFx0bGFiZWw6ICcnLFxuXHRcdFx0XHRkZWZhdWx0X2xhYmVsOiAnJyxcblx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuXHRcdFx0XHRsbmc6IGxhdGxuZy5sbmcsXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMucGxpbmdNYXJrZXIgPSB0cnVlO1xuXHRcdFx0Y29sbGVjdGlvbi5hZGQoIG1vZGVsICk7XG5cdFx0XHR0aGlzLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHRpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcblx0XHRcdH1cblx0XHRcdC8vIGFkZCBhbiBleHRyYSBjb250cm9sIHBhbmVsIHJlZ2lvbiBmb3Igb3V0IHNlYXJjaFxuIFx0XHRcdHRoaXMubWFwLl9jb250cm9sQ29ybmVyc1snYWJvdmUnXSA9ICRhYm92ZS5nZXQoMCk7XG5cbiBcdFx0XHR0aGlzLmdlb2NvZGVyID0gTC5Db250cm9sLmdlb2NvZGVyKHtcbiBcdFx0XHRcdGNvbGxhcHNlZDogZmFsc2UsXG4gXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuIFx0XHRcdFx0cGxhY2Vob2xkZXI6aTE4bi5zZWFyY2gsXG4gXHRcdFx0XHRlcnJvck1lc3NhZ2U6aTE4bi5ub3RoaW5nX2ZvdW5kLFxuIFx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG4gXHRcdFx0XHRzdWdnZXN0TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRzdWdnZXN0VGltZW91dDoyNTAsXG4gXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuIFx0XHRcdFx0ZGVmYXVsdE1hcmtHZW9jb2RlOmZhbHNlLFxuXHRcdFx0XHRnZW9jb2RlcjpMLkNvbnRyb2wuR2VvY29kZXIubm9taW5hdGltKHtcblx0XHRcdFx0XHRodG1sVGVtcGxhdGU6IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHRcdFx0XHRcdFx0dmFyIHBhcnRzID0gW10sXG5cdFx0XHRcdFx0XHRcdHRlbXBsYXRlQ29uZmlnID0ge1xuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRlOiAvXFx7KC4rPylcXH0vZ1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRhZGRyID0gXy5kZWZhdWx0cyggcmVzdWx0LmFkZHJlc3MsIHtcblx0XHRcdFx0XHRcdFx0XHRidWlsZGluZzonJyxcblx0XHRcdFx0XHRcdFx0XHRyb2FkOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhvdXNlX251bWJlcjonJyxcblxuXHRcdFx0XHRcdFx0XHRcdHBvc3Rjb2RlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGNpdHk6JycsXG5cdFx0XHRcdFx0XHRcdFx0dG93bjonJyxcblx0XHRcdFx0XHRcdFx0XHR2aWxsYWdlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhhbWxldDonJyxcblxuXHRcdFx0XHRcdFx0XHRcdHN0YXRlOicnLFxuXHRcdFx0XHRcdFx0XHRcdGNvdW50cnk6JycsXG5cdFx0XHRcdFx0XHRcdH0gKTtcblxuXHRcdFx0XHRcdFx0cGFydHMucHVzaCggXy50ZW1wbGF0ZSggaTE4bi5hZGRyZXNzX2Zvcm1hdC5zdHJlZXQsIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LmNpdHksIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LmNvdW50cnksIHRlbXBsYXRlQ29uZmlnICkoIGFkZHIgKSApO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm4gcGFydHNcblx0XHRcdFx0XHRcdFx0Lm1hcCggZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsLnJlcGxhY2UoL1xccysvZywnICcpLnRyaW0oKSB9IClcblx0XHRcdFx0XHRcdFx0LmZpbHRlciggZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGVsICE9PSAnJyB9IClcblx0XHRcdFx0XHRcdFx0LmpvaW4oJywgJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG4gXHRcdFx0fSlcbiBcdFx0XHQub24oJ21hcmtnZW9jb2RlJyxmdW5jdGlvbihlKXtcbiBcdFx0XHRcdC8vIHNlYXJjaCByZXN1bHQgY2xpY2tcbiBcdFx0XHRcdHZhciBsYXRsbmcgPSAgZS5nZW9jb2RlLmNlbnRlcixcbiBcdFx0XHRcdFx0Y291bnRfbWFya2VycyA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoLFxuIFx0XHRcdFx0XHRsYWJlbCA9IHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCBbIGUuZ2VvY29kZSBdLCBsYXRsbmcgKSxcbiBcdFx0XHRcdFx0bWFya2VyX2RhdGEgPSB7XG4gXHRcdFx0XHRcdFx0bGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcbiBcdFx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmdcbiBcdFx0XHRcdFx0fSxcbiBcdFx0XHRcdFx0bW9kZWw7XG5cdFx0XHRcdC8vIGdldHRpbmcgcmlkIG9mIHRoZSBtb2RhbCDigJMgIzM1XG5cdFx0XHRcdHNlbGYuZ2VvY29kZXIuX2NsZWFyUmVzdWx0cygpO1xuXHRcdFx0XHRzZWxmLmdlb2NvZGVyLl9pbnB1dC52YWx1ZSA9ICcnO1xuXG5cdFx0XHRcdC8vIG5vIG1hcmtlcnMgLSBqdXN0IGFkYXB0IG1hcCB2aWV3XG4gXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLm1hcC5maXRCb3VuZHMoIGUuZ2VvY29kZS5iYm94ICk7XG5cbiBcdFx0XHRcdH1cblxuXG4gXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSBmYWxzZSB8fCBjb3VudF9tYXJrZXJzIDwgc2VsZi5jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdFx0Ly8gaW5maW5pdGUgbWFya2VycyBvciBtYXJrZXJzIHN0aWxsIGluIHJhbmdlXG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9IGVsc2UgaWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMSApIHtcblx0XHRcdFx0XHQvLyBvbmUgbWFya2VyIG9ubHlcbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hdCgwKS5zZXQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH1cblxuIFx0XHRcdFx0c2VsZi5tYXAuc2V0VmlldyggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCkgKTsgLy8ga2VlcCB6b29tLCBtaWdodCBiZSBjb25mdXNpbmcgZWxzZVxuXG4gXHRcdFx0fSlcbiBcdFx0XHQuYWRkVG8oIHRoaXMubWFwICk7XG5cbiBcdFx0fSxcblx0XHRyZXZlcnNlR2VvY29kZTpmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGxhdGxuZyA9IHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfTtcblx0XHRcdHRoaXMuZ2VvY29kZXIub3B0aW9ucy5nZW9jb2Rlci5yZXZlcnNlKFxuXHRcdFx0XHRsYXRsbmcsXG5cdFx0XHRcdHNlbGYubWFwLmdldFpvb20oKSxcblx0XHRcdFx0ZnVuY3Rpb24oIHJlc3VsdHMgKSB7XG5cdFx0XHRcdFx0bW9kZWwuc2V0KCdkZWZhdWx0X2xhYmVsJywgc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIHJlc3VsdHMsIGxhdGxuZyApICk7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fSxcblx0XHRwYXJzZUdlb2NvZGVSZXN1bHQ6IGZ1bmN0aW9uKCByZXN1bHRzLCBsYXRsbmcgKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSBmYWxzZTtcblxuXHRcdFx0aWYgKCAhIHJlc3VsdHMubGVuZ3RoICkge1xuXHRcdFx0XHRsYWJlbCA9IGxhdGxuZy5sYXQgKyAnLCAnICsgbGF0bG5nLmxuZztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzdWx0cywgZnVuY3Rpb24oIGksIHJlc3VsdCApIHtcblxuXHRcdFx0XHRcdGxhYmVsID0gcmVzdWx0Lmh0bWw7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHQvLyB0cmltXG5cdFx0XHRyZXR1cm4gbGFiZWw7XG5cdFx0fSxcblxuXG5cblx0XHQvKipcblx0XHQgKlx0TGF5ZXJzXG5cdCBcdCovXG5cdFx0aW5pdExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBbXSxcblx0XHRcdFx0YmFzZUxheWVycyA9IHt9LFxuXHRcdFx0XHRvdmVybGF5cyA9IHt9LFxuXHRcdFx0XHRpc19vbWl0dGVkID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGtleSA9PT0gbnVsbCB8fCAoICEhIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAmJiBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZigga2V5ICkgPT09IC0xICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldHVwTWFwID0gZnVuY3Rpb24oIHZhbCwga2V5ICl7XG5cdFx0XHRcdFx0dmFyIGxheWVyO1xuXHRcdFx0XHRcdGlmICggXy5pc09iamVjdCh2YWwpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICQuZWFjaCggdmFsLCBzZXR1cE1hcCApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggaXNfb21pdHRlZChrZXkpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRsYXllciA9IEwudGlsZUxheWVyLnByb3ZpZGVyKCBrZXkgLyosIGxheWVyX2NvbmZpZy5vcHRpb25zKi8gKTtcblx0XHRcdFx0XHR9IGNhdGNoKGV4KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxheWVyLnByb3ZpZGVyS2V5ID0ga2V5O1xuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGtleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdG92ZXJsYXlzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0YmFzZUxheWVyc1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxlY3RlZExheWVycy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcik7XG4gXHRcdFx0XHRcdH1cbiBcdFx0XHRcdH07XG5cbiBcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMubW9kZWwuZ2V0KCdsYXllcnMnKTsgLy8gc2hvdWxkIGJlIGxheWVyIHN0b3JlIHZhbHVlXG5cbiBcdFx0XHQvLyBmaWx0ZXIgYXZhaWFsYmxlIGxheWVycyBpbiBmaWVsZCB2YWx1ZVxuIFx0XHRcdGlmICggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICE9PSBmYWxzZSAmJiBfLmlzQXJyYXkoIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyApICkge1xuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBzZWxlY3RlZExheWVycy5maWx0ZXIoIGZ1bmN0aW9uKGVsKSB7XG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZiggZWwgKSAhPT0gLTE7XG4gXHRcdFx0XHR9KTtcbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBzZXQgZGVmYXVsdCBsYXllclxuIFx0XHRcdGlmICggISBzZWxlY3RlZExheWVycy5sZW5ndGggKSB7XG5cbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLnNsaWNlKCAwLCAxICk7XG5cbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBlZGl0YWJsZSBsYXllcnMhXG5cblx0XHRcdHRoaXMubWFwLm9uKCAnYmFzZWxheWVyY2hhbmdlIGxheWVyYWRkIGxheWVycmVtb3ZlJywgZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0aWYgKCAhIGUubGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBsYXllcnMgPSBbXTtcblxuXHRcdFx0XHRzZWxmLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcblx0XHRcdFx0XHRpZiAoICEgbGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xheWVycycsIGxheWVycyApO1xuXHRcdFx0fSApO1xuXG4gXHRcdFx0JC5lYWNoKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMsIHNldHVwTWFwICk7XG5cblx0XHRcdHRoaXMubGF5ZXJzQ29udHJvbCA9IEwuY29udHJvbC5sYXllcnMoIGJhc2VMYXllcnMsIG92ZXJsYXlzLCB7XG5cdFx0XHRcdGNvbGxhcHNlZDogdHJ1ZSxcblx0XHRcdFx0aGlkZVNpbmdsZUJhc2U6IHRydWUsXG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG4gXHRcdH0sXG5cdFx0bGF5ZXJfaXNfb3ZlcmxheTogZnVuY3Rpb24oICBrZXksIGxheWVyICkge1xuXG5cdFx0XHRpZiAoIGxheWVyLm9wdGlvbnMub3BhY2l0eSAmJiBsYXllci5vcHRpb25zLm9wYWNpdHkgPCAxICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHBhdHRlcm5zID0gW1xuXHRcdFx0XHQnXihPcGVuV2VhdGhlck1hcHxPcGVuU2VhTWFwKScsXG5cdFx0XHRcdCdPcGVuTWFwU3VyZmVyLihIeWJyaWR8QWRtaW5Cb3VuZHN8Q29udG91ckxpbmVzfEhpbGxzaGFkZXxFbGVtZW50c0F0UmlzayknLFxuXHRcdFx0XHQnSGlrZUJpa2UuSGlsbFNoYWRpbmcnLFxuXHRcdFx0XHQnU3RhbWVuLihUb25lcnxUZXJyYWluKShIeWJyaWR8TGluZXN8TGFiZWxzKScsXG5cdFx0XHRcdCdUb21Ub20uKEh5YnJpZHxMYWJlbHMpJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0hFUkUodjM/KS50cmFmZmljRmxvdycsXG5cdFx0XHRcdCdIRVJFKHYzPykubWFwTGFiZWxzJ1xuXHRcdFx0XS5qb2luKCd8Jyk7XG5cdFx0XHRyZXR1cm4ga2V5Lm1hdGNoKCcoJyArIHBhdHRlcm5zICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCBtYXAgbGF5ZXJzXG5cdFx0XHR0aGlzLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpe1xuXHRcdFx0XHRpZiAoIGxheWVyLmNvbnN0cnVjdG9yID09PSBMLlRpbGVMYXllci5Qcm92aWRlciApIHtcblx0XHRcdFx0XHRsYXllci5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgPT09IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy52aXNpYmxlID0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJyk7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHR0aGlzLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2FjZjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHRvZ2dsZV9jYiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIG5vIGNoYW5nZVxuXHRcdFx0XHRcdHNlbGYudXBkYXRlX3Zpc2libGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0Ly8gZXhwYW5kL2NvbGxhcHNlIGFjZiBzZXR0aW5nXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnc2hvdycsIHRvZ2dsZV9jYiApO1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ2hpZGUnLCB0b2dnbGVfY2IgKTtcblxuXHRcdFx0Ly8gZXhwYW5kIHdwIG1ldGFib3hcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdwb3N0Ym94LXRvZ2dsZWQnLCB0b2dnbGVfY2IgKTtcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsJy53aWRnZXQtdG9wIConLCB0b2dnbGVfY2IgKTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlX21hcDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXRsbmcgPSB7IGxhdDogdGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IHRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9XG5cdFx0XHR0aGlzLm1hcC5zZXRWaWV3KFxuXHRcdFx0XHRsYXRsbmcsXG5cdFx0XHRcdHRoaXMubW9kZWwuZ2V0KCd6b29tJylcblx0XHRcdCk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRpZiAoICEgTC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyICkge1xuXHRcdFx0XHRMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRcdFx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0XHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1hZGQtbG9jYXRpb24tbWFya2VyIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyKTtcblx0XHQgICAgICAgICAgICAgICAgdGhpcy5fbGluay50aXRsZSA9IGkxOG4uYWRkX21hcmtlcl9hdF9sb2NhdGlvbjtcblx0XHQgICAgICAgICAgICAgICAgdGhpcy5faWNvbiA9IEwuRG9tVXRpbC5jcmVhdGUoJ3NwYW4nLCAnZGFzaGljb25zIGRhc2hpY29ucy1sb2NhdGlvbicsIHRoaXMuX2xpbmspO1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uUmVtb3ZlOmZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uICk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHRcdGlmICggISBMLkNvbnRyb2wuRml0Qm91bmRzQ29udHJvbCApIHtcblx0XHRcdFx0TC5Db250cm9sLkZpdEJvdW5kc0NvbnRyb2wgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRcdFx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0XHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1maXQtYm91bmRzIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyICk7XG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rLnRpdGxlID0gaTE4bi5maXRfbWFya2Vyc19pbl92aWV3O1xuXHRcdFx0XHRcdFx0dGhpcy5faWNvbiA9IEwuRG9tVXRpbC5jcmVhdGUoJ3NwYW4nLCAnZGFzaGljb25zIGRhc2hpY29ucy1lZGl0b3ItZXhwYW5kJywgdGhpcy5fbGluayApO1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uICk7XG5cblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXI7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvblJlbW92ZTpmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHR2YXIgZWRpdG9yLFxuXHRcdFx0XHRtYXAgPSBlLmRldGFpbC5tYXA7XG5cblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKSB9ICk7XG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgZ2V0IGxvYWRlZCAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ2FwcGVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0JC5hY2ZfbGVhZmxldCgpO1xuXHR9KTtcblx0Ly8gaW5pdCB3aGVuIGZpZWxkcyBzaG93IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZCcsIGZ1bmN0aW9uKCBmaWVsZCApIHtcblxuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgIT09IGZpZWxkLnR5cGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcblxuXG5cbn0pKCBqUXVlcnksIGFjZl9vc21fYWRtaW4sIHdpbmRvdyApO1xuIl19

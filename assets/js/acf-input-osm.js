(function( $, arg, exports ){
	var options = arg.options,
		i18n = arg.i18n,
		result_tpl = '<div tabindex="<%= data.i %>" class="osm-result">'
			+ '<%= data.result_text %>'
			+ '<br /><small><%= data.properties.osm_value %></small>'
			+ '</div>';

	var osm = exports.osm = {
	};
	
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
		}
	});

	osm.Field = Backbone.View.extend({

		map: null,
		field: null,
		geocoder: null,
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

			this.init_acf();

			if ( this.config.allow_providers ) {
				// prevent default layer creation
				this.$el.on( 'acf-osm-map-create-layers', this.preventDefault );
				this.initLayers();
			}

			this.$el.on( 'acf-osm-map-create-markers', this.preventDefault );

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


			acf.addAction('remount_field/type=open_street_map', function(field){
				if ( self.field === field ) {
					self.map.invalidateSize();
				}
			})
			return this;
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
					.dragging.enable();
				entry.$el.appendTo( self.$markers() );
			});

			model.on('destroy',function(){
				marker.remove();
			});

			marker.addTo( this.map );


		},
		initMarkers:function(){

			var self = this, 
				len;

			this.initGeocode();
			this.$el.attr('data-has-markers', 'false');
			this.$el.attr('data-can-add-marker', 'false');
			
			// no markers allowed!
			if ( this.config.max_markers === 0 ) {
				return;
			}

			len = this.model.get('markers').length;
			this.icon = new L.DivIcon({
				html: '',
				className:'osm-marker-icon'
			});

			this.model.get('markers').forEach( function( model ) {
				self.addMarker( model );
			} );

			this.map.on('dblclick', function(e){
				var latlng = e.latlng,
					collection = self.model.get('markers'),
					model;
				
				e.originalEvent.preventDefault();
				e.originalEvent.stopPropagation();
				// no more markers
				if ( self.config.max_markers !== false && collection.length >= self.config.max_markers ) {
					return;
				}
				model = new osm.MarkerData({
					label: '',
					default_label: '',
					lat: latlng.lat,
					lng: latlng.lng,
//					collection:self.model.get('markers')
				})
				collection.add( model );
				self.reverseGeocode(model);
			})
			.doubleClickZoom.disable(); 

			this.updateMarkerState();

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

 				if ( self.config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}
 				if ( count_markers < self.config.max_markers ) {

 					self.model.get('markers').add( marker_data );

 				} else if ( self.config.max_markers === 1 ) {
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
				// https://xkcd.com/2170/
				label = latlng.lat + ', ' + latlng.lng;
			} else {
				$.each( results, function( i, result ) {
					if ( !! result.html ) {
						label = $('<p>'+result.html+'</p>').text().trim().replace(/(\s+)/g,' ');
					} else {
						label = result.name;
					}
					return false;
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
				mapLayers = {},
				is_omitted = function(key) {
					return key === null || ( !! self.config.restrict_providers && self.config.restrict_providers.indexOf( key ) === -1 );
				},
				setupMap = function( val, key ){
					var layer, layer_config;
					if ( _.isObject(val) ) {
						return $.each( val, setupMap );
					}

					if ( is_omitted(key) ) {
						return;
					}
					if ( !! mapLayers[ key ] ) {
						layer = mapLayers[ key ];
						self.map.addLayer(layer)
					} else {
						try {
							layer = L.tileLayer.provider( key /*, layer_config.options*/ );
						} catch(ex) {
							return;
						}
						layer.providerKey = key;
					}

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
			var patterns;

			if ( layer.options.opacity && layer.options.opacity < 1 ) {
				return true;
			}
			patterns = ['^(OpenWeatherMap|OpenSeaMap)',
				'OpenMapSurfer.AdminBounds',
				'Stamen.Toner(Hybrid|Lines|Labels)',
				'Acetate.(foreground|labels|roads)',
				'HillShading',
				'Hydda.RoadsAndLabels',
				'^JusticeMap',
				'OpenInfraMap.(Power|Telecom|Petroleum|Water)',
				'OpenPtMap',
				'OpenRailwayMap',
				'OpenFireMap',
				'SafeCast',
				'CartoDB.DarkMatterOnlyLabels',
				'CartoDB.PositronOnlyLabels'
			];
			return key.match('(' + patterns.join('|') + ')') !== null;
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
			// don't init in repeater templates
			if ( $(e.target).closest('[data-id="acfcloneindex"]').length ) {
				e.preventDefault();
				return;
			}
		})
		.on( 'acf-osm-map-init', function( e, map ) {
			var editor;

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
//	acf.addAction( 'new_field', function(field){console.log(field)} );
	// init when fields get loaded ...
	acf.addAction( 'append', function(){
		$.acf_leaflet();
	});
	// init when fields shw ...
	acf.addAction( 'show_field', function( field ) {

		if ( 'open_street_map' !== field.type ) {
			return;
		}
	    var editor = field.$el.find('[data-editor-config]').data( '_map_editor' );
	    editor.update_visible();
	});

	

})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtaW5wdXQtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9wdGlvbnMgPSBhcmcub3B0aW9ucyxcblx0XHRpMThuID0gYXJnLmkxOG4sXG5cdFx0cmVzdWx0X3RwbCA9ICc8ZGl2IHRhYmluZGV4PVwiPCU9IGRhdGEuaSAlPlwiIGNsYXNzPVwib3NtLXJlc3VsdFwiPidcblx0XHRcdCsgJzwlPSBkYXRhLnJlc3VsdF90ZXh0ICU+J1xuXHRcdFx0KyAnPGJyIC8+PHNtYWxsPjwlPSBkYXRhLnByb3BlcnRpZXMub3NtX3ZhbHVlICU+PC9zbWFsbD4nXG5cdFx0XHQrICc8L2Rpdj4nO1xuXG5cdHZhciBvc20gPSBleHBvcnRzLm9zbSA9IHtcblx0fTtcblx0XG5cdHZhciBmaXhlZEZsb2F0R2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGZpeGVkRmxvYXRTZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQocGFyc2VGbG9hdCh2YWx1ZSkudG9GaXhlZChmaXgpICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRHZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50U2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KCB2YWx1ZSApO1xuXHRcdH1cblx0fVxuXG5cdHZhciBHU01vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuXHRcdGdldDogZnVuY3Rpb24oYXR0cikge1xuXHRcdFx0Ly8gQ2FsbCB0aGUgZ2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLmdldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmdldHRlcnNbYXR0cl0uY2FsbCh0aGlzKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBhdHRyKTtcblx0XHR9LFxuXG5cdFx0c2V0OiBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB7XG5cdFx0XHR2YXIgYXR0cnMsIGF0dHI7XG5cblx0XHRcdC8vIE5vcm1hbGl6ZSB0aGUga2V5LXZhbHVlIGludG8gYW4gb2JqZWN0XG5cdFx0XHRpZiAoXy5pc09iamVjdChrZXkpIHx8IGtleSA9PSBudWxsKSB7XG5cdFx0XHRcdGF0dHJzID0ga2V5O1xuXHRcdFx0XHRvcHRpb25zID0gdmFsdWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhdHRycyA9IHt9O1xuXHRcdFx0XHRhdHRyc1trZXldID0gdmFsdWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGFsd2F5cyBwYXNzIGFuIG9wdGlvbnMgaGFzaCBhcm91bmQuIFRoaXMgYWxsb3dzIG1vZGlmeWluZ1xuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgaW5zaWRlIHRoZSBzZXR0ZXJcblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0XHQvLyBHbyBvdmVyIGFsbCB0aGUgc2V0IGF0dHJpYnV0ZXMgYW5kIGNhbGwgdGhlIHNldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGZvciAoYXR0ciBpbiBhdHRycykge1xuXHRcdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuc2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0XHRhdHRyc1thdHRyXSA9IHRoaXMuc2V0dGVyc1thdHRyXS5jYWxsKHRoaXMsIGF0dHJzW2F0dHJdLCBvcHRpb25zKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJzLCBvcHRpb25zKTtcblx0XHR9LFxuXG5cdFx0Z2V0dGVyczoge30sXG5cblx0XHRzZXR0ZXJzOiB7fVxuXG5cdH0pO1xuXG5cdG9zbS5NYXJrZXJEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0R2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRHZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0aXNEZWZhdWx0TGFiZWw6ZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXQoJ2xhYmVsJykgPT09IHRoaXMuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdFx0bW9kZWw6b3NtLk1hcmtlckRhdGFcblx0fSk7XG5cdFxuXHRcblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckVudHJ5ID0gd3AuQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0dGVtcGxhdGU6d3AudGVtcGxhdGUoJ29zbS1tYXJrZXItaW5wdXQnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwibG9jYXRlLW1hcmtlclwiXScgOiAnbG9jYXRlX21hcmtlcicsXG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cInJlbW92ZS1tYXJrZXJcIl0nIDogJ3JlbW92ZV9tYXJrZXInLFxuXHRcdFx0J2NoYW5nZSBbZGF0YS1uYW1lPVwibGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0KXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyOyAvLyBsZWFmbGV0IG1hcmtlclxuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5tb2RlbCA9IG9wdC5tb2RlbDtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGFiZWwnLCB0aGlzLmNoYW5nZWRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpkZWZhdWx0X2xhYmVsJywgdGhpcy5jaGFuZ2VkRGVmYXVsdExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUgKTtcblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJylcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gbGFiZWwgKSB7XG5cdFx0XHRcdGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5tb2RlbC5pc0RlZmF1bHRMYWJlbCgpICkge1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsc1xuXHRcdFx0XHR0aGlzLnNldF9tYXJrZXJfbGFiZWwoIGxhYmVsICk7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWwgaW5wdXRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItZ2VvY29kZVwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5fdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcigpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCk7XG5cdFx0XHQvKlxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGF0XCJdJykudmFsKCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sbmdcIl0nKS52YWwoIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhYmVsXCJdJykudmFsKCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvKi9cblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhYmVsJywgdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0Ly8qL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gY2xpY2sgcmVtb3ZlXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLm1vZGVsLmRlc3Ryb3koKTsgLy8gXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cdG9zbS5GaWVsZCA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuXHRcdG1hcDogbnVsbCxcblx0XHRmaWVsZDogbnVsbCxcblx0XHRnZW9jb2RlcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLmNvbmZpZ1x0XHQ9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdGlmICggdGhpcy5jb25maWcuYWxsb3dfcHJvdmlkZXJzICkge1xuXHRcdFx0XHQvLyBwcmV2ZW50IGRlZmF1bHQgbGF5ZXIgY3JlYXRpb25cblx0XHRcdFx0dGhpcy4kZWwub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUtbGF5ZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApO1xuXHRcdFx0XHR0aGlzLmluaXRMYXllcnMoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUtbWFya2VycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblxuXHRcdFx0dGhpcy5pbml0TWFya2VycygpO1xuXG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMuYWRkTWFya2VyICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ3JlbW92ZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHQvL3RoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF5ZXJzJywgY29uc29sZS50cmFjZSApO1xuXG5cdFx0XHQvLyB1cGRhdGUgb24gbWFwIHZpZXcgY2hhbmdlXG5cdFx0XHR0aGlzLm1hcC5vbignem9vbWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ3pvb20nLHNlbGYubWFwLmdldFpvb20oKSk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gc2VsZi5tYXAuZ2V0Q2VudGVyKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbGF0JyxsYXRsbmcubGF0ICk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsbmcnLGxhdGxuZy5sbmcgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV92aXNpYmxlKCk7XG5cblx0XHRcdHRoaXMudXBkYXRlX21hcCgpO1xuXG5cblx0XHRcdGFjZi5hZGRBY3Rpb24oJ3JlbW91bnRfZmllbGQvdHlwZT1vcGVuX3N0cmVldF9tYXAnLCBmdW5jdGlvbihmaWVsZCl7XG5cdFx0XHRcdGlmICggc2VsZi5maWVsZCA9PT0gZmllbGQgKSB7XG5cdFx0XHRcdFx0c2VsZi5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0Z2V0TWFwRGF0YTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0gSlNPTi5wYXJzZSggdGhpcy4kdmFsdWUoKS52YWwoKSApO1xuXHRcdFx0ZGF0YS5sYXQgPSBkYXRhLmxhdCB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sYXQnKTtcblx0XHRcdGRhdGEubG5nID0gZGF0YS5sbmcgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbG5nJyk7XG5cdFx0XHRkYXRhLnpvb20gPSBkYXRhLnpvb20gfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtem9vbScpO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHR1cGRhdGVWYWx1ZTpmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJHZhbHVlKCkudmFsKCBKU09OLnN0cmluZ2lmeSggdGhpcy5tb2RlbC50b0pTT04oKSApICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQvL3RoaXMuJGVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cdFx0XHR0aGlzLnVwZGF0ZU1hcmtlclN0YXRlKCk7XG5cdFx0fSxcblx0XHR1cGRhdGVNYXJrZXJTdGF0ZTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsZW4gPSB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aDtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGFzLW1hcmtlcnMnLCAhIWxlbiA/ICd0cnVlJyA6ICdmYWxzZScpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1jYW4tYWRkLW1hcmtlcicsICggZmFsc2UgPT09IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzIHx8IGxlbiA8IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzKSA/ICd0cnVlJyA6ICdmYWxzZScpO1x0XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKlx0TWFya2Vyc1xuXHRcdCAqL1xuXHRcdGFkZE1hcmtlcjpmdW5jdGlvbiggbW9kZWwsIGNvbGxlY3Rpb24gKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Ly8gYWRkIG1hcmtlciB0byBtYXBcblx0XHRcdHZhciBtYXJrZXIgPSBMLm1hcmtlciggeyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9LCB7XG5cdFx0XHRcdFx0dGl0bGU6IG1vZGVsLmdldCgnbGFiZWwnKSxcblx0XHRcdFx0XHRpY29uOiB0aGlzLmljb24sXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5iaW5kVG9vbHRpcCggbW9kZWwuZ2V0KCdsYWJlbCcpICk7XG5cblx0XHRcdC8vIFxuXHRcdFx0dmFyIGVudHJ5ID0gbmV3IG9zbS5NYXJrZXJFbnRyeSh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdG1hcmtlcjogbWFya2VyLFxuXHRcdFx0XHRtb2RlbDogbW9kZWxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbmNlKCdsYXllcmFkZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdG1hcmtlclxuXHRcdFx0XHRcdC5vbignY2xpY2snLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0bW9kZWwuZGVzdHJveSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm9uKCdkcmFnZW5kJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBtb2RlbCBsbmdsYXRcblx0XHRcdFx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLmdldExhdExuZygpO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHRcdFx0XHRcdC8vIGdlb2NvZGUsIGdldCBsYWJlbCwgc2V0IG1vZGVsIGxhYmVsLi4uXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuZHJhZ2dpbmcuZW5hYmxlKCk7XG5cdFx0XHRcdGVudHJ5LiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bW9kZWwub24oJ2Rlc3Ryb3knLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG1hcmtlci5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtYXJrZXIuYWRkVG8oIHRoaXMubWFwICk7XG5cblxuXHRcdH0sXG5cdFx0aW5pdE1hcmtlcnM6ZnVuY3Rpb24oKXtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLCBcblx0XHRcdFx0bGVuO1xuXG5cdFx0XHR0aGlzLmluaXRHZW9jb2RlKCk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJywgJ2ZhbHNlJyk7XG5cdFx0XHRcblx0XHRcdC8vIG5vIG1hcmtlcnMgYWxsb3dlZCFcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0bGVuID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGg7XG5cdFx0XHR0aGlzLmljb24gPSBuZXcgTC5EaXZJY29uKHtcblx0XHRcdFx0aHRtbDogJycsXG5cdFx0XHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlci1pY29uJ1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykuZm9yRWFjaCggZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0XHRzZWxmLmFkZE1hcmtlciggbW9kZWwgKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0dGhpcy5tYXAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBlLmxhdGxuZyxcblx0XHRcdFx0XHRjb2xsZWN0aW9uID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKSxcblx0XHRcdFx0XHRtb2RlbDtcblx0XHRcdFx0XG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdC8vIG5vIG1vcmUgbWFya2Vyc1xuXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb2xsZWN0aW9uLmxlbmd0aCA+PSBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0bW9kZWwgPSBuZXcgb3NtLk1hcmtlckRhdGEoe1xuXHRcdFx0XHRcdGxhYmVsOiAnJyxcblx0XHRcdFx0XHRkZWZhdWx0X2xhYmVsOiAnJyxcblx0XHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG5cdFx0XHRcdFx0bG5nOiBsYXRsbmcubG5nLFxuLy9cdFx0XHRcdFx0Y29sbGVjdGlvbjpzZWxmLm1vZGVsLmdldCgnbWFya2VycycpXG5cdFx0XHRcdH0pXG5cdFx0XHRcdGNvbGxlY3Rpb24uYWRkKCBtb2RlbCApO1xuXHRcdFx0XHRzZWxmLnJldmVyc2VHZW9jb2RlKG1vZGVsKTtcblx0XHRcdH0pXG5cdFx0XHQuZG91YmxlQ2xpY2tab29tLmRpc2FibGUoKTsgXG5cblx0XHRcdHRoaXMudXBkYXRlTWFya2VyU3RhdGUoKTtcblxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKlx0R2VvY29kaW5nXG5cdFx0ICpcblx0XHQgKlx0QG9uIG1hcC5sYXllcmFkZCwgbGF5ZXIuZHJhZ2VuZFxuXHRcdCAqL1xuXHRcdCBpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdFx0Ly8gYWRkIGFuIGV4dHJhIGNvbnRyb2wgcGFuZWwgcmVnaW9uIGZvciBvdXQgc2VhcmNoXG4gXHRcdFx0dGhpcy5tYXAuX2NvbnRyb2xDb3JuZXJzWydhYm92ZSddID0gJGFib3ZlLmdldCgwKTtcblxuIFx0XHRcdHRoaXMuZ2VvY29kZXIgPSBMLkNvbnRyb2wuZ2VvY29kZXIoe1xuIFx0XHRcdFx0Y29sbGFwc2VkOiBmYWxzZSxcbiBcdFx0XHRcdHBvc2l0aW9uOidhYm92ZScsXG4gXHRcdFx0XHRwbGFjZWhvbGRlcjppMThuLnNlYXJjaCxcbiBcdFx0XHRcdGVycm9yTWVzc2FnZTppMThuLm5vdGhpbmdfZm91bmQsXG4gXHRcdFx0XHRzaG93UmVzdWx0SWNvbnM6dHJ1ZSxcbiBcdFx0XHRcdHN1Z2dlc3RNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdHN1Z2dlc3RUaW1lb3V0OjI1MCxcbiBcdFx0XHRcdHF1ZXJ5TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRkZWZhdWx0TWFya0dlb2NvZGU6ZmFsc2UsXG4gXHRcdFx0fSlcbiBcdFx0XHQub24oJ21hcmtnZW9jb2RlJyxmdW5jdGlvbihlKXtcbiBcdFx0XHRcdC8vIHNlYXJjaCByZXN1bHQgY2xpY2tcbiBcdFx0XHRcdHZhciBsYXRsbmcgPSAgZS5nZW9jb2RlLmNlbnRlcixcbiBcdFx0XHRcdFx0Y291bnRfbWFya2VycyA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoLFxuIFx0XHRcdFx0XHRsYWJlbCA9IHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCBbIGUuZ2VvY29kZSBdLCBsYXRsbmcgKSxcbiBcdFx0XHRcdFx0bWFya2VyX2RhdGEgPSB7XG4gXHRcdFx0XHRcdFx0bGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcbiBcdFx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmdcbiBcdFx0XHRcdFx0fSwgXG4gXHRcdFx0XHRcdG1vZGVsO1xuXG4gXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLm1hcC5maXRCb3VuZHMoIGUuZ2VvY29kZS5iYm94ICk7XG5cbiBcdFx0XHRcdH1cbiBcdFx0XHRcdGlmICggY291bnRfbWFya2VycyA8IHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9IGVsc2UgaWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMSApIHtcbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hdCgwKS5zZXQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH1cblxuIFx0XHRcdFx0c2VsZi5tYXAuc2V0VmlldyggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCkgKTsgLy8ga2VlcCB6b29tLCBtaWdodCBiZSBjb25mdXNpbmcgZWxzZVxuXG4gXHRcdFx0fSlcbiBcdFx0XHQuYWRkVG8oIHRoaXMubWFwICk7XG5cbiBcdFx0fSxcblx0XHRyZXZlcnNlR2VvY29kZTpmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIFxuXHRcdFx0XHRsYXRsbmcgPSB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH07XG5cdFx0XHR0aGlzLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZSggXG5cdFx0XHRcdGxhdGxuZywgXG5cdFx0XHRcdHNlbGYubWFwLmdldFpvb20oKSwgXG5cdFx0XHRcdGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZGVmYXVsdF9sYWJlbCcsIHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCByZXN1bHRzLCBsYXRsbmcgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cdFx0cGFyc2VHZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0cywgbGF0bG5nICkge1xuXHRcdFx0dmFyIGxhYmVsID0gZmFsc2U7XG5cblx0XHRcdGlmICggISByZXN1bHRzLmxlbmd0aCApIHtcblx0XHRcdFx0Ly8gaHR0cHM6Ly94a2NkLmNvbS8yMTcwL1xuXHRcdFx0XHRsYWJlbCA9IGxhdGxuZy5sYXQgKyAnLCAnICsgbGF0bG5nLmxuZztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzdWx0cywgZnVuY3Rpb24oIGksIHJlc3VsdCApIHtcblx0XHRcdFx0XHRpZiAoICEhIHJlc3VsdC5odG1sICkge1xuXHRcdFx0XHRcdFx0bGFiZWwgPSAkKCc8cD4nK3Jlc3VsdC5odG1sKyc8L3A+JykudGV4dCgpLnRyaW0oKS5yZXBsYWNlKC8oXFxzKykvZywnICcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHQgXHQqL1xuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG5cdFx0XHRcdGJhc2VMYXllcnMgPSB7fSxcblx0XHRcdFx0b3ZlcmxheXMgPSB7fSxcblx0XHRcdFx0bWFwTGF5ZXJzID0ge30sXG5cdFx0XHRcdGlzX29taXR0ZWQgPSBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4ga2V5ID09PSBudWxsIHx8ICggISEgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICYmIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBrZXkgKSA9PT0gLTEgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0dXBNYXAgPSBmdW5jdGlvbiggdmFsLCBrZXkgKXtcblx0XHRcdFx0XHR2YXIgbGF5ZXIsIGxheWVyX2NvbmZpZztcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAhISBtYXBMYXllcnNbIGtleSBdICkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBtYXBMYXllcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIGtleSAvKiwgbGF5ZXJfY29uZmlnLm9wdGlvbnMqLyApO1xuXHRcdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSgga2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYXNlTGF5ZXJzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGVjdGVkTGF5ZXJzLmluZGV4T2YoIGtleSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKTtcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0fTtcblxuIFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpOyAvLyBzaG91bGQgYmUgbGF5ZXIgc3RvcmUgdmFsdWVcblxuIFx0XHRcdC8vIGZpbHRlciBhdmFpYWxibGUgbGF5ZXJzIGluIGZpZWxkIHZhbHVlXG4gXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgIT09IGZhbHNlICYmIF8uaXNBcnJheSggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHNlbGVjdGVkTGF5ZXJzLmZpbHRlciggZnVuY3Rpb24oZWwpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBlbCApICE9PSAtMTtcbiBcdFx0XHRcdH0pO1xuIFx0XHRcdH1cblxuIFx0XHRcdC8vIHNldCBkZWZhdWx0IGxheWVyXG4gXHRcdFx0aWYgKCAhIHNlbGVjdGVkTGF5ZXJzLmxlbmd0aCApIHtcblxuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuc2xpY2UoIDAsIDEgKTtcblxuIFx0XHRcdH1cblxuIFx0XHRcdC8vIGVkaXRhYmxlIGxheWVycyFcblxuXHRcdFx0dGhpcy5tYXAub24oICdiYXNlbGF5ZXJjaGFuZ2UgbGF5ZXJhZGQgbGF5ZXJyZW1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFxuXHRcdFx0XHRpZiAoICEgZS5sYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGxheWVycyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikge1xuXHRcdFx0XHRcdGlmICggISBsYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSggbGF5ZXIucHJvdmlkZXJLZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRsYXllcnMucHVzaCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYXllcnMudW5zaGlmdCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF5ZXJzJywgbGF5ZXJzICk7XG5cdFx0XHR9ICk7XG5cbiBcdFx0XHQkLmVhY2goIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycywgc2V0dXBNYXAgKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5sYXllcnNDb250cm9sID0gTC5jb250cm9sLmxheWVycyggYmFzZUxheWVycywgb3ZlcmxheXMsIHtcblx0XHRcdFx0Y29sbGFwc2VkOiB0cnVlLFxuXHRcdFx0XHRoaWRlU2luZ2xlQmFzZTogdHJ1ZSxcblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcbiBcdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cdFx0XHR2YXIgcGF0dGVybnM7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cGF0dGVybnMgPSBbJ14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci5BZG1pbkJvdW5kcycsXG5cdFx0XHRcdCdTdGFtZW4uVG9uZXIoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnQWNldGF0ZS4oZm9yZWdyb3VuZHxsYWJlbHN8cm9hZHMpJyxcblx0XHRcdFx0J0hpbGxTaGFkaW5nJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5JbmZyYU1hcC4oUG93ZXJ8VGVsZWNvbXxQZXRyb2xldW18V2F0ZXIpJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdDYXJ0b0RCLkRhcmtNYXR0ZXJPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0NhcnRvREIuUG9zaXRyb25Pbmx5TGFiZWxzJ1xuXHRcdFx0XTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMuam9pbignfCcpICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCBtYXAgbGF5ZXJzXG5cdFx0XHR0aGlzLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpe1xuXHRcdFx0XHRpZiAoIGxheWVyLmNvbnN0cnVjdG9yID09PSBMLlRpbGVMYXllci5Qcm92aWRlciApIHtcblx0XHRcdFx0XHRsYXllci5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgPT09IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy52aXNpYmxlID0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJyk7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHR0aGlzLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2FjZjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHRvZ2dsZV9jYiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIG5vIGNoYW5nZVxuXHRcdFx0XHRcdHNlbGYudXBkYXRlX3Zpc2libGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0Ly8gZXhwYW5kL2NvbGxhcHNlIGFjZiBzZXR0aW5nXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnc2hvdycsIHRvZ2dsZV9jYiApO1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ2hpZGUnLCB0b2dnbGVfY2IgKTtcblxuXHRcdFx0Ly8gZXhwYW5kIHdwIG1ldGFib3hcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdwb3N0Ym94LXRvZ2dsZWQnLCB0b2dnbGVfY2IgKTtcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsJy53aWRnZXQtdG9wIConLCB0b2dnbGVfY2IgKTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlX21hcDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXRsbmcgPSB7IGxhdDogdGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IHRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9XG5cdFx0XHR0aGlzLm1hcC5zZXRWaWV3KCBcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHR0aGlzLm1vZGVsLmdldCgnem9vbScpIFxuXHRcdFx0KTtcblx0XHR9XG5cdH0pO1xuXG5cblx0JChkb2N1bWVudClcblx0XHQub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUsIG1hcCApIHtcblx0XHRcdHZhciBlZGl0b3I7XG5cblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKSB9ICk7XG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuLy9cdGFjZi5hZGRBY3Rpb24oICduZXdfZmllbGQnLCBmdW5jdGlvbihmaWVsZCl7Y29uc29sZS5sb2coZmllbGQpfSApO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2h3IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZCcsIGZ1bmN0aW9uKCBmaWVsZCApIHtcblxuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgIT09IGZpZWxkLnR5cGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcblxuXHRcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=

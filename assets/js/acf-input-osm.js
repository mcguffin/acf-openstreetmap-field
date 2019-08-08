(function( $, arg, exports ){
	var options = arg.options,
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
			lat:fixedFloatGetter('lat',6),
			lng:fixedFloatGetter('lng',6),
			zoom:intGetter('zoom'),
		},
		setters: {
			lat:fixedFloatSetter('lat',6),
			lng:fixedFloatSetter('lng',6),
			zoom:intSetter('zoom'),
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
			center_lat:fixedFloatGetter('center_lat',6),
			center_lng:fixedFloatGetter('center_lng',6),
			zoom:intGetter('zoom'),
		},
		setters: {
			center_lat:fixedFloatSetter('center_lat',6),
			center_lng:fixedFloatSetter('center_lng',6),
			zoom:intSetter('zoom'),
		},
		initialize:function(o) {
			this.set( 'markers', new osm.MarkerCollection(o.markers) );
			GSModel.prototype.initialize.apply(this,arguments)
		}
	});
	osm.MarkerEntry = wp.media.View.extend({
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
			this.$('[data-name="label"]').val( label );

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
				.val( this.model.get('label') );
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

			this.$el.find('[id$="-marker-geocode"]').val( label );

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
		initialize:function(conf) {

			var self = this,
				data = this.getMapData();

			this.map		= conf.map;

			this.model		= new osm.MapData(data);

			this.init_acf();

			this.initLayers();

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
				
				self.model.set('center_lat',latlng.lat );
				self.model.set('center_lng',latlng.lng );
			});

			this.update_visible();

			this.update_map();

			return this;
		},
		getMapData:function() {
			var data = JSON.parse( this.$value().val() );
			data.center_lat = data.center_lat || 0;
			data.center_lng = data.center_lng || 0;
			data.zoom = data.zoom || 0;
			return data;
		},
		updateValue:function() {
			this.$value().val( JSON.stringify( this.model.toJSON() ) );
			//this.$el.trigger('change')
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
				editor_config = this.$el.data().editorConfig;

			this.initGeocode();

			// no markers allowed!
			if ( editor_config.max_markers === 0 ) {
				return;
			}

			this.icon = new L.DivIcon({
				html: '',
				className:'osm-marker-icon'
			});

			this.model.get('markers').forEach( function( model ) {
				self.addMarker( model );
			} );

			this.map.on('dblclick', function(e){
				var latlng = e.latlng,
					count_markers = self.$markers().children().not('[data-id]').length,
					model;
				
				e.originalEvent.preventDefault();
				e.originalEvent.stopPropagation();
				// no more markers
				if ( editor_config.max_markers !== false && count_markers >= editor_config.max_markers ) {
					return;
				}
				model = new osm.MarkerData({
					label: '',
					default_label: '',
					lat: latlng.lat,
					lng: latlng.lng,
//					collection:self.model.get('markers')
				})
				self.model.get('markers').add( model );
				self.reverseGeocode(model);
			})
			.doubleClickZoom.disable(); 
		},

		/**
		 *	Geocoding
		 *
		 *	@on map.layeradd, layer.dragend
		 */
		 initGeocode:function() {

 			var self = this,
 				editor_config = this.$el.data().editorConfig;

 			this.map._controlCorners['above'] = $('<div class="acf-osm-above"></div>').insertBefore( this.$el ).get(0);

 			this.geocoder = L.Control.geocoder({
 				collapsed: false,
 				position:'above',
 				placeholder:'Search...',
 				errorMessage:'Nothing found...',
 				showResultIcons:true,
 				suggestMinLength:3,
 				suggestTimeout:250,
 				queryMinLength:3,
 				defaultMarkGeocode:false,
 			})
 			.on('markgeocode',function(e){
 				// search result click
 				var latlng =  e.geocode.center,
 					editor_config = self.$el.data().editorConfig,
 					count_markers = self.model.get('markers').length,
 					label = self.parseGeocodeResult( [ e.geocode ], latlng ),
 					marker_data = {
 						label: label,
 						default_label: label,
 						lat: latlng.lat,
 						lng: latlng.lng
 					}, 
 					model;

 				if ( editor_config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}
 				if ( count_markers < editor_config.max_markers ) {

 					self.model.get('markers').add( marker_data );

 				} else if ( editor_config.max_markers === 1 ) {
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
 				editor_config = this.$el.data().editorConfig,
 				is_omitted = function(key) {
 					return key === null || ( !! editor_config.restrict_providers && editor_config.restrict_providers.indexOf( key ) === -1 );
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
 			if ( editor_config.restrict_providers !== false && _.isArray( editor_config.restrict_providers ) ) {
 				selectedLayers = selectedLayers.filter( function(el) {
 					return editor_config.restrict_providers.indexOf( el ) !== -1;
 				});
 			}

 			// set default layer
 			if ( ! selectedLayers.length ) {

 				selectedLayers = editor_config.restrict_providers.slice( 0, 1 );

 			}

 			// editable layers!
 			if ( editor_config.allow_providers ) {

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
 			}


 			$.each( editor_config.restrict_providers, setupMap );
 			// ... no layer editing allowed
 			if ( editor_config.allow_providers ) {

 				this.layersControl = L.control.layers( baseLayers, overlays, {
 					collapsed: true,
 					hideSingleBase: true,
 				}).addTo(this.map);
 			}
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
			var latlng = { lat: this.model.get('center_lat'), lng: this.model.get('center_lng') }
			this.map.setView( 
				latlng,
				this.model.get('zoom') 
			);
		}
	});


	$(document)
		.on('acf-osm-map-init',function( e, map ) {
			// don't init in repeater templates
			if ( $(e.target).closest('[data-id="acfcloneindex"]').length ) {
				e.preventDefault();
				return;
			}
			// wrap osm.Field backbone view around editors
			if ( $(e.target).is('[data-editor-config]') ) {
				e.preventDefault();

				(function checkVis(){
					if ( ! $(e.target).is(':visible') ) {
						return setTimeout(checkVis,250);
					}
					map.invalidateSize();
				})();

				$(e.target).data( '_map_editor', new osm.Field( { el: e.target, map: map } ) );
			}
		});

	// init when fields get loaded ...
	acf.addAction( 'append', function(){
		$.acf_leaflet();
	});
	// init when fields shw ...
	acf.addAction( 'show_field/type=open_street_map', function( field ){
	    var editor = field.$el.find('[data-editor-config]').data( '_map_editor' );
	    editor.update_visible();
	});
})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtaW5wdXQtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9wdGlvbnMgPSBhcmcub3B0aW9ucyxcblx0XHRyZXN1bHRfdHBsID0gJzxkaXYgdGFiaW5kZXg9XCI8JT0gZGF0YS5pICU+XCIgY2xhc3M9XCJvc20tcmVzdWx0XCI+J1xuXHRcdFx0KyAnPCU9IGRhdGEucmVzdWx0X3RleHQgJT4nXG5cdFx0XHQrICc8YnIgLz48c21hbGw+PCU9IGRhdGEucHJvcGVydGllcy5vc21fdmFsdWUgJT48L3NtYWxsPidcblx0XHRcdCsgJzwvZGl2Pic7XG5cblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtID0ge1xuXHR9O1xuXHRcblx0dmFyIGZpeGVkRmxvYXRHZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgZml4ZWRGbG9hdFNldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChwYXJzZUZsb2F0KHZhbHVlKS50b0ZpeGVkKGZpeCkgKTtcblx0XHR9XG5cdH1cblx0dmFyIGludEdldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRTZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHZhbHVlICk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIEdTTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG5cdFx0Z2V0OiBmdW5jdGlvbihhdHRyKSB7XG5cdFx0XHQvLyBDYWxsIHRoZSBnZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuZ2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0dGVyc1thdHRyXS5jYWxsKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGF0dHIpO1xuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcblx0XHRcdHZhciBhdHRycywgYXR0cjtcblxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBrZXktdmFsdWUgaW50byBhbiBvYmplY3Rcblx0XHRcdGlmIChfLmlzT2JqZWN0KGtleSkgfHwga2V5ID09IG51bGwpIHtcblx0XHRcdFx0YXR0cnMgPSBrZXk7XG5cdFx0XHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0dHJzID0ge307XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWx3YXlzIHBhc3MgYW4gb3B0aW9ucyBoYXNoIGFyb3VuZC4gVGhpcyBhbGxvd3MgbW9kaWZ5aW5nXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyBpbnNpZGUgdGhlIHNldHRlclxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRcdC8vIEdvIG92ZXIgYWxsIHRoZSBzZXQgYXR0cmlidXRlcyBhbmQgY2FsbCB0aGUgc2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0Zm9yIChhdHRyIGluIGF0dHJzKSB7XG5cdFx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5zZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRcdGF0dHJzW2F0dHJdID0gdGhpcy5zZXR0ZXJzW2F0dHJdLmNhbGwodGhpcywgYXR0cnNbYXR0cl0sIG9wdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cnMsIG9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRnZXR0ZXJzOiB7fSxcblxuXHRcdHNldHRlcnM6IHt9XG5cblx0fSk7XG5cblx0b3NtLk1hcmtlckRhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoJ2xhdCcsNiksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlcignbG5nJyw2KSxcblx0XHRcdHpvb206aW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlcignbGF0Jyw2KSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCdsbmcnLDYpLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOm9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXHRcblx0XG5cdG9zbS5NYXBEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGNlbnRlcl9sYXQ6Zml4ZWRGbG9hdEdldHRlcignY2VudGVyX2xhdCcsNiksXG5cdFx0XHRjZW50ZXJfbG5nOmZpeGVkRmxvYXRHZXR0ZXIoJ2NlbnRlcl9sbmcnLDYpLFxuXHRcdFx0em9vbTppbnRHZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGNlbnRlcl9sYXQ6Zml4ZWRGbG9hdFNldHRlcignY2VudGVyX2xhdCcsNiksXG5cdFx0XHRjZW50ZXJfbG5nOmZpeGVkRmxvYXRTZXR0ZXIoJ2NlbnRlcl9sbmcnLDYpLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckVudHJ5ID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0dGVtcGxhdGU6d3AudGVtcGxhdGUoJ29zbS1tYXJrZXItaW5wdXQnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwibG9jYXRlLW1hcmtlclwiXScgOiAnbG9jYXRlX21hcmtlcicsXG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cInJlbW92ZS1tYXJrZXJcIl0nIDogJ3JlbW92ZV9tYXJrZXInLFxuXHRcdFx0J2NoYW5nZSBbZGF0YS1uYW1lPVwibGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0KXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyOyAvLyBsZWFmbGV0IG1hcmtlclxuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5tb2RlbCA9IG9wdC5tb2RlbDtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGFiZWwnLCB0aGlzLmNoYW5nZWRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpkZWZhdWx0X2xhYmVsJywgdGhpcy5jaGFuZ2VkRGVmYXVsdExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUgKTtcblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJylcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgKTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gbGFiZWwgKSB7XG5cdFx0XHRcdGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5tb2RlbC5pc0RlZmF1bHRMYWJlbCgpICkge1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsc1xuXHRcdFx0XHR0aGlzLnNldF9tYXJrZXJfbGFiZWwoIGxhYmVsICk7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWwgaW5wdXRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItZ2VvY29kZVwiXScpLnZhbCggbGFiZWwgKTtcblxuXHRcdFx0dGhpcy5fdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcigpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCk7XG5cdFx0XHQvKlxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGF0XCJdJykudmFsKCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sbmdcIl0nKS52YWwoIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhYmVsXCJdJykudmFsKCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvKi9cblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhYmVsJywgdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0Ly8qL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gY2xpY2sgcmVtb3ZlXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLm1vZGVsLmRlc3Ryb3koKTsgLy8gXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cdG9zbS5GaWVsZCA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuXHRcdG1hcDogbnVsbCxcblx0XHRnZW9jb2RlcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLm1hcFx0XHQ9IGNvbmYubWFwO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdHRoaXMuaW5pdExheWVycygpO1xuXG5cdFx0XHR0aGlzLmluaXRNYXJrZXJzKCk7XG5cblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy5hZGRNYXJrZXIgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAncmVtb3ZlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdC8vdGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXllcnMnLCBjb25zb2xlLnRyYWNlICk7XG5cblx0XHRcdC8vIHVwZGF0ZSBvbiBtYXAgdmlldyBjaGFuZ2Vcblx0XHRcdHRoaXMubWFwLm9uKCd6b29tZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnem9vbScsc2VsZi5tYXAuZ2V0Wm9vbSgpKTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5tYXAub24oJ21vdmVlbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBzZWxmLm1hcC5nZXRDZW50ZXIoKTtcblx0XHRcdFx0XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdjZW50ZXJfbGF0JyxsYXRsbmcubGF0ICk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdjZW50ZXJfbG5nJyxsYXRsbmcubG5nICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy51cGRhdGVfdmlzaWJsZSgpO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV9tYXAoKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRnZXRNYXBEYXRhOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSBKU09OLnBhcnNlKCB0aGlzLiR2YWx1ZSgpLnZhbCgpICk7XG5cdFx0XHRkYXRhLmNlbnRlcl9sYXQgPSBkYXRhLmNlbnRlcl9sYXQgfHwgMDtcblx0XHRcdGRhdGEuY2VudGVyX2xuZyA9IGRhdGEuY2VudGVyX2xuZyB8fCAwO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IDA7XG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9LFxuXHRcdHVwZGF0ZVZhbHVlOmZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kdmFsdWUoKS52YWwoIEpTT04uc3RyaW5naWZ5KCB0aGlzLm1vZGVsLnRvSlNPTigpICkgKTtcblx0XHRcdC8vdGhpcy4kZWwudHJpZ2dlcignY2hhbmdlJylcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcdE1hcmtlcnNcblx0XHQgKi9cblx0XHRhZGRNYXJrZXI6ZnVuY3Rpb24oIG1vZGVsLCBjb2xsZWN0aW9uICkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIGFkZCBtYXJrZXIgdG8gbWFwXG5cdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfSwge1xuXHRcdFx0XHRcdHRpdGxlOiBtb2RlbC5nZXQoJ2xhYmVsJyksXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5pY29uLFxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYmluZFRvb2x0aXAoIG1vZGVsLmdldCgnbGFiZWwnKSApO1xuXG5cdFx0XHQvLyBcblx0XHRcdHZhciBlbnRyeSA9IG5ldyBvc20uTWFya2VyRW50cnkoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRtYXJrZXI6IG1hcmtlcixcblx0XHRcdFx0bW9kZWw6IG1vZGVsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tYXAub25jZSgnbGF5ZXJhZGQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRtYXJrZXJcblx0XHRcdFx0XHQub24oJ2NsaWNrJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdG1vZGVsLmRlc3Ryb3koKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5vbignZHJhZ2VuZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgbW9kZWwgbG5nbGF0XG5cdFx0XHRcdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5nZXRMYXRMbmcoKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUoIG1vZGVsICk7XG5cdFx0XHRcdFx0XHQvLyBnZW9jb2RlLCBnZXQgbGFiZWwsIHNldCBtb2RlbCBsYWJlbC4uLlxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmRyYWdnaW5nLmVuYWJsZSgpO1xuXHRcdFx0XHRlbnRyeS4kZWwuYXBwZW5kVG8oIHNlbGYuJG1hcmtlcnMoKSApO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1vZGVsLm9uKCdkZXN0cm95JyxmdW5jdGlvbigpe1xuXHRcdFx0XHRtYXJrZXIucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bWFya2VyLmFkZFRvKCB0aGlzLm1hcCApO1xuXG5cdFx0fSxcblx0XHRpbml0TWFya2VyczpmdW5jdGlvbigpe1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLmluaXRHZW9jb2RlKCk7XG5cblx0XHRcdC8vIG5vIG1hcmtlcnMgYWxsb3dlZCFcblx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmljb24gPSBuZXcgTC5EaXZJY29uKHtcblx0XHRcdFx0aHRtbDogJycsXG5cdFx0XHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlci1pY29uJ1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykuZm9yRWFjaCggZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0XHRzZWxmLmFkZE1hcmtlciggbW9kZWwgKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0dGhpcy5tYXAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBlLmxhdGxuZyxcblx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi4kbWFya2VycygpLmNoaWxkcmVuKCkubm90KCdbZGF0YS1pZF0nKS5sZW5ndGgsXG5cdFx0XHRcdFx0bW9kZWw7XG5cdFx0XHRcdFxuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0ZS5vcmlnaW5hbEV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHQvLyBubyBtb3JlIG1hcmtlcnNcblx0XHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb3VudF9tYXJrZXJzID49IGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG1vZGVsID0gbmV3IG9zbS5NYXJrZXJEYXRhKHtcblx0XHRcdFx0XHRsYWJlbDogJycsXG5cdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogJycsXG5cdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuXHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcbi8vXHRcdFx0XHRcdGNvbGxlY3Rpb246c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbW9kZWwgKTtcblx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZShtb2RlbCk7XG5cdFx0XHR9KVxuXHRcdFx0LmRvdWJsZUNsaWNrWm9vbS5kaXNhYmxlKCk7IFxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKlx0R2VvY29kaW5nXG5cdFx0ICpcblx0XHQgKlx0QG9uIG1hcC5sYXllcmFkZCwgbGF5ZXIuZHJhZ2VuZFxuXHRcdCAqL1xuXHRcdCBpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcbiBcdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG4gXHRcdFx0dGhpcy5tYXAuX2NvbnRyb2xDb3JuZXJzWydhYm92ZSddID0gJCgnPGRpdiBjbGFzcz1cImFjZi1vc20tYWJvdmVcIj48L2Rpdj4nKS5pbnNlcnRCZWZvcmUoIHRoaXMuJGVsICkuZ2V0KDApO1xuXG4gXHRcdFx0dGhpcy5nZW9jb2RlciA9IEwuQ29udHJvbC5nZW9jb2Rlcih7XG4gXHRcdFx0XHRjb2xsYXBzZWQ6IGZhbHNlLFxuIFx0XHRcdFx0cG9zaXRpb246J2Fib3ZlJyxcbiBcdFx0XHRcdHBsYWNlaG9sZGVyOidTZWFyY2guLi4nLFxuIFx0XHRcdFx0ZXJyb3JNZXNzYWdlOidOb3RoaW5nIGZvdW5kLi4uJyxcbiBcdFx0XHRcdHNob3dSZXN1bHRJY29uczp0cnVlLFxuIFx0XHRcdFx0c3VnZ2VzdE1pbkxlbmd0aDozLFxuIFx0XHRcdFx0c3VnZ2VzdFRpbWVvdXQ6MjUwLFxuIFx0XHRcdFx0cXVlcnlNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdGRlZmF1bHRNYXJrR2VvY29kZTpmYWxzZSxcbiBcdFx0XHR9KVxuIFx0XHRcdC5vbignbWFya2dlb2NvZGUnLGZ1bmN0aW9uKGUpe1xuIFx0XHRcdFx0Ly8gc2VhcmNoIHJlc3VsdCBjbGlja1xuIFx0XHRcdFx0dmFyIGxhdGxuZyA9ICBlLmdlb2NvZGUuY2VudGVyLFxuIFx0XHRcdFx0XHRlZGl0b3JfY29uZmlnID0gc2VsZi4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcbiBcdFx0XHRcdFx0Y291bnRfbWFya2VycyA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoLFxuIFx0XHRcdFx0XHRsYWJlbCA9IHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCBbIGUuZ2VvY29kZSBdLCBsYXRsbmcgKSxcbiBcdFx0XHRcdFx0bWFya2VyX2RhdGEgPSB7XG4gXHRcdFx0XHRcdFx0bGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcbiBcdFx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmdcbiBcdFx0XHRcdFx0fSwgXG4gXHRcdFx0XHRcdG1vZGVsO1xuXG4gXHRcdFx0XHRpZiAoIGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblxuIFx0XHRcdFx0fVxuIFx0XHRcdFx0aWYgKCBjb3VudF9tYXJrZXJzIDwgZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyApIHtcblxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fSBlbHNlIGlmICggZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyA9PT0gMSApIHtcbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hdCgwKS5zZXQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH1cblxuIFx0XHRcdFx0c2VsZi5tYXAuc2V0VmlldyggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCkgKTsgLy8ga2VlcCB6b29tLCBtaWdodCBiZSBjb25mdXNpbmcgZWxzZVxuXG4gXHRcdFx0fSlcbiBcdFx0XHQuYWRkVG8oIHRoaXMubWFwICk7XG5cbiBcdFx0fSxcblx0XHRyZXZlcnNlR2VvY29kZTpmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIFxuXHRcdFx0XHRsYXRsbmcgPSB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH07XG5cdFx0XHR0aGlzLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZSggXG5cdFx0XHRcdGxhdGxuZywgXG5cdFx0XHRcdHNlbGYubWFwLmdldFpvb20oKSwgXG5cdFx0XHRcdGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZGVmYXVsdF9sYWJlbCcsIHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCByZXN1bHRzLCBsYXRsbmcgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cdFx0cGFyc2VHZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0cywgbGF0bG5nICkge1xuXHRcdFx0dmFyIGxhYmVsID0gZmFsc2U7XG5cblx0XHRcdGlmICggISByZXN1bHRzLmxlbmd0aCApIHtcblx0XHRcdFx0Ly8gaHR0cHM6Ly94a2NkLmNvbS8yMTcwL1xuXHRcdFx0XHRsYWJlbCA9IGxhdGxuZy5sYXQgKyAnLCAnICsgbGF0bG5nLmxuZztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzdWx0cywgZnVuY3Rpb24oIGksIHJlc3VsdCApIHtcblx0XHRcdFx0XHRpZiAoICEhIHJlc3VsdC5odG1sICkge1xuXHRcdFx0XHRcdFx0bGFiZWwgPSAkKCc8cD4nK3Jlc3VsdC5odG1sKyc8L3A+JykudGV4dCgpLnRyaW0oKS5yZXBsYWNlKC8oXFxzKykvZywnICcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHRcdCAqL1xuXHRcdCBpbml0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG4gXHRcdFx0XHRiYXNlTGF5ZXJzID0ge30sXG4gXHRcdFx0XHRvdmVybGF5cyA9IHt9LFxuIFx0XHRcdFx0bWFwTGF5ZXJzID0ge30sXG4gXHRcdFx0XHRlZGl0b3JfY29uZmlnID0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcbiBcdFx0XHRcdGlzX29taXR0ZWQgPSBmdW5jdGlvbihrZXkpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIGtleSA9PT0gbnVsbCB8fCAoICEhIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICYmIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGtleSApID09PSAtMSApO1xuIFx0XHRcdFx0fSxcbiBcdFx0XHRcdHNldHVwTWFwID0gZnVuY3Rpb24oIHZhbCwga2V5ICl7XG4gXHRcdFx0XHRcdHZhciBsYXllciwgbGF5ZXJfY29uZmlnO1xuIFx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcbiBcdFx0XHRcdFx0XHRyZXR1cm4gJC5lYWNoKCB2YWwsIHNldHVwTWFwICk7XG4gXHRcdFx0XHRcdH1cblxuIFx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcbiBcdFx0XHRcdFx0XHRyZXR1cm47XG4gXHRcdFx0XHRcdH1cbiBcdFx0XHRcdFx0aWYgKCAhISBtYXBMYXllcnNbIGtleSBdICkge1xuIFx0XHRcdFx0XHRcdGxheWVyID0gbWFwTGF5ZXJzWyBrZXkgXTtcbiBcdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcilcbiBcdFx0XHRcdFx0fSBlbHNlIHtcbiBcdFx0XHRcdFx0XHR0cnkge1xuIFx0XHRcdFx0XHRcdFx0bGF5ZXIgPSBMLnRpbGVMYXllci5wcm92aWRlcigga2V5IC8qLCBsYXllcl9jb25maWcub3B0aW9ucyovICk7XG4gXHRcdFx0XHRcdFx0fSBjYXRjaChleCkge1xuIFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuIFx0XHRcdFx0XHRcdH1cbiBcdFx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcbiBcdFx0XHRcdFx0fVxuXG4gXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBrZXksIGxheWVyICkgKSB7XG4gXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuIFx0XHRcdFx0XHR9IGVsc2Uge1xuIFx0XHRcdFx0XHRcdGJhc2VMYXllcnNba2V5XSA9IGxheWVyO1xuIFx0XHRcdFx0XHR9XG5cbiBcdFx0XHRcdFx0aWYgKCBzZWxlY3RlZExheWVycy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG4gXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHR9O1xuXG4gXHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7IC8vIHNob3VsZCBiZSBsYXllciBzdG9yZSB2YWx1ZVxuXG4gXHRcdFx0Ly8gZmlsdGVyIGF2YWlhbGJsZSBsYXllcnMgaW4gZmllbGQgdmFsdWVcbiBcdFx0XHRpZiAoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICE9PSBmYWxzZSAmJiBfLmlzQXJyYXkoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHNlbGVjdGVkTGF5ZXJzLmZpbHRlciggZnVuY3Rpb24oZWwpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGVsICkgIT09IC0xO1xuIFx0XHRcdFx0fSk7XG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gc2V0IGRlZmF1bHQgbGF5ZXJcbiBcdFx0XHRpZiAoICEgc2VsZWN0ZWRMYXllcnMubGVuZ3RoICkge1xuXG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLnNsaWNlKCAwLCAxICk7XG5cbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBlZGl0YWJsZSBsYXllcnMhXG4gXHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLmFsbG93X3Byb3ZpZGVycyApIHtcblxuIFx0XHRcdFx0dGhpcy5tYXAub24oICdiYXNlbGF5ZXJjaGFuZ2UgbGF5ZXJhZGQgbGF5ZXJyZW1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcbiBcdFx0XHRcdFx0aWYgKCAhIGUubGF5ZXIucHJvdmlkZXJLZXkgKSB7XG4gXHRcdFx0XHRcdFx0cmV0dXJuO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHRcdHZhciBsYXllcnMgPSBbXTtcblxuIFx0XHRcdFx0XHRzZWxmLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcbiBcdFx0XHRcdFx0XHRpZiAoICEgbGF5ZXIucHJvdmlkZXJLZXkgKSB7XG4gXHRcdFx0XHRcdFx0XHRyZXR1cm47XG4gXHRcdFx0XHRcdFx0fVxuXG4gXHRcdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuIFx0XHRcdFx0XHRcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcbiBcdFx0XHRcdFx0XHR9IGVsc2Uge1xuIFx0XHRcdFx0XHRcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcbiBcdFx0XHRcdFx0XHR9XG4gXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF5ZXJzJywgbGF5ZXJzICk7XG4gXHRcdFx0XHR9ICk7XG4gXHRcdFx0fVxuXG5cbiBcdFx0XHQkLmVhY2goIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLCBzZXR1cE1hcCApO1xuIFx0XHRcdC8vIC4uLiBubyBsYXllciBlZGl0aW5nIGFsbG93ZWRcbiBcdFx0XHRpZiAoIGVkaXRvcl9jb25maWcuYWxsb3dfcHJvdmlkZXJzICkge1xuXG4gXHRcdFx0XHR0aGlzLmxheWVyc0NvbnRyb2wgPSBMLmNvbnRyb2wubGF5ZXJzKCBiYXNlTGF5ZXJzLCBvdmVybGF5cywge1xuIFx0XHRcdFx0XHRjb2xsYXBzZWQ6IHRydWUsXG4gXHRcdFx0XHRcdGhpZGVTaW5nbGVCYXNlOiB0cnVlLFxuIFx0XHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuIFx0XHRcdH1cbiBcdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cdFx0XHR2YXIgcGF0dGVybnM7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cGF0dGVybnMgPSBbJ14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci5BZG1pbkJvdW5kcycsXG5cdFx0XHRcdCdTdGFtZW4uVG9uZXIoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnQWNldGF0ZS4oZm9yZWdyb3VuZHxsYWJlbHN8cm9hZHMpJyxcblx0XHRcdFx0J0hpbGxTaGFkaW5nJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5JbmZyYU1hcC4oUG93ZXJ8VGVsZWNvbXxQZXRyb2xldW18V2F0ZXIpJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdDYXJ0b0RCLkRhcmtNYXR0ZXJPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0NhcnRvREIuUG9zaXRyb25Pbmx5TGFiZWxzJ1xuXHRcdFx0XTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMuam9pbignfCcpICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCBtYXAgbGF5ZXJzXG5cdFx0XHR0aGlzLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpe1xuXHRcdFx0XHRpZiAoIGxheWVyLmNvbnN0cnVjdG9yID09PSBMLlRpbGVMYXllci5Qcm92aWRlciApIHtcblx0XHRcdFx0XHRsYXllci5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgPT09IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy52aXNpYmxlID0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJyk7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHR0aGlzLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2FjZjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHRvZ2dsZV9jYiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIG5vIGNoYW5nZVxuXHRcdFx0XHRcdHNlbGYudXBkYXRlX3Zpc2libGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0Ly8gZXhwYW5kL2NvbGxhcHNlIGFjZiBzZXR0aW5nXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnc2hvdycsIHRvZ2dsZV9jYiApO1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ2hpZGUnLCB0b2dnbGVfY2IgKTtcblxuXHRcdFx0Ly8gZXhwYW5kIHdwIG1ldGFib3hcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdwb3N0Ym94LXRvZ2dsZWQnLCB0b2dnbGVfY2IgKTtcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsJy53aWRnZXQtdG9wIConLCB0b2dnbGVfY2IgKTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlX21hcDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXRsbmcgPSB7IGxhdDogdGhpcy5tb2RlbC5nZXQoJ2NlbnRlcl9sYXQnKSwgbG5nOiB0aGlzLm1vZGVsLmdldCgnY2VudGVyX2xuZycpIH1cblx0XHRcdHRoaXMubWFwLnNldFZpZXcoIFxuXHRcdFx0XHRsYXRsbmcsXG5cdFx0XHRcdHRoaXMubW9kZWwuZ2V0KCd6b29tJykgXG5cdFx0XHQpO1xuXHRcdH1cblx0fSk7XG5cblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbignYWNmLW9zbS1tYXAtaW5pdCcsZnVuY3Rpb24oIGUsIG1hcCApIHtcblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyB3cmFwIG9zbS5GaWVsZCBiYWNrYm9uZSB2aWV3IGFyb3VuZCBlZGl0b3JzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmlzKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpICkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0KGZ1bmN0aW9uIGNoZWNrVmlzKCl7XG5cdFx0XHRcdFx0aWYgKCAhICQoZS50YXJnZXQpLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoY2hlY2tWaXMsMjUwKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH0pKCk7XG5cblx0XHRcdFx0JChlLnRhcmdldCkuZGF0YSggJ19tYXBfZWRpdG9yJywgbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwIH0gKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgZ2V0IGxvYWRlZCAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ2FwcGVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0JC5hY2ZfbGVhZmxldCgpO1xuXHR9KTtcblx0Ly8gaW5pdCB3aGVuIGZpZWxkcyBzaHcgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdzaG93X2ZpZWxkL3R5cGU9b3Blbl9zdHJlZXRfbWFwJywgZnVuY3Rpb24oIGZpZWxkICl7XG5cdCAgICB2YXIgZWRpdG9yID0gZmllbGQuJGVsLmZpbmQoJ1tkYXRhLWVkaXRvci1jb25maWddJykuZGF0YSggJ19tYXBfZWRpdG9yJyApO1xuXHQgICAgZWRpdG9yLnVwZGF0ZV92aXNpYmxlKCk7XG5cdH0pO1xufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=

(function( $, arg, exports ){

$(document).on( 'acf-osm-map-admin-init', e => {
	
	e.detail.map.getContainer()._leaflet_map = e.detail.map;
	e.detail.map.getContainer()._leaflet_map_admin = e.detail.mapAdmin;

} )

const getMap = setting => {
	return setting.$fieldObject.find('.leaflet-map').get(0)._leaflet_map
}
const getMapAdmin = setting => {
	return setting.$fieldObject.find('.leaflet-map').get(0)._leaflet_map_admin
}

const FormatSetting = acf.FieldSetting.extend({
	type: 'open_street_map',
	name: 'return_format',
	events: {
		'change': 'onChange'
	},
	onChange: function( e, $el ) {
		// 2DO: 
		const mapAdmin = getMapAdmin(this);
		mapAdmin.removeControl('providers')
		if ( 'osm' === this.$el.find(':checked').val() ) {
			Object.values(getMap(this)._layers).forEach( l => l.remove() )
			mapAdmin
				.addControl( { type: 'providers', config: Object.values(acf_osm_admin.options.osm_layers) } )
				.setLayer('OpenStreetMap.Mapnik')
		} else {
			mapAdmin.addControl( { type: 'providers', config: Object.values(acf_osm_admin.options.leaflet_layers) } )
		}
		
	}
});

const ViewSetting = acf.FieldSetting.extend({
	type: 'open_street_map',
	name: 'center_lat',
	events: {
		'change [type="number"]': 'onChange'
	},
	onChange: function( e, $el ) {
		// set map from inputs
		getMap(this).setView( {
			lat: parseFloat( this.fieldObject.$input('center_lat').val() ),
			lng: parseFloat( this.fieldObject.$input('center_lng').val() ),
		}, parseInt( this.fieldObject.$input('zoom').val() ) )
	}
});

const OpenStreetMapFieldSetting = acf.FieldSetting.extend({
	type: 'open_street_map',
	name: 'leaflet_map',
	events: {
		'change .osm-json': 'onChange'
	},
	onChange: function( e, $el ) {
		// set values from map
		const map = getMap(this)
		const center = map.getCenter()

		this.fieldObject.setProp( 'center_lat', center.lat )
		this.fieldObject.setProp( 'center_lng', center.lng )
		this.fieldObject.setProp( 'zoom', map.getZoom() )
		// change lat / lng / zoom / layers
	}
});
acf.registerFieldSetting( FormatSetting )
acf.registerFieldSetting( ViewSetting )
acf.registerFieldSetting( OpenStreetMapFieldSetting );

/*
	var osmField = osm.Field;
	osm.Field = osmField.extend({
		$lat: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-center_lat"]');
		},
		$lng: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-center_lng"]');
		},
		$zoom: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-zoom"]');
		},
		$returnFormat: function() {
			return this.$el.closest('.acf-field-settings').find('[data-name="return_format"]');
		},
		getMapData:function() {
			var data = {
				lat: parseFloat(this.$lat().val() || this.$el.data().mapLat ),
				lng: parseFloat(this.$lng().val() || this.$el.data().mapLng ),
				zoom: parseInt(this.$zoom().val() || this.$el.data().mapZoom ),
				layers: this.$el.data().mapLayers,
			};
			return data;
		},
		initialize:function(conf) {

			osmField.prototype.initialize.apply( this, [ conf ] );
			this.bindMapListener();
			this.bindListener();
		},
		updateInput: function() {
			this.$lat().val( this.model.get('lat') ).trigger('change');
			this.$lng().val( this.model.get('lng') ).trigger('change');
			this.$zoom().val( this.model.get('zoom') ).trigger('change');
		},
		init_locator_add:function(){},
		initLayers:function() {
			var layers = this.model.get('layers');

			this.config.restrict_providers = this.$returnFormat().find(':checked').val() === 'osm'
				? Object.values( arg.options.osm_layers )
				: Object.values( arg.options.leaflet_layers );

			osmField.prototype.initLayers.apply(this,arguments);

			var $layers = $( this.layersControl.getContainer() ).find('[type="radio"],[type="checkbox"]'),
				name = this.$zoom().attr('name').replace('[zoom]','[layers][]');

			$layers.each(function(i,el){
				var $el = $(el);
				$(el)
					.attr( 'name', name )
					.attr( 'value', $el.next().text().trim() );
			});
			// if ( ! $layers.find(':checked').length ) {
			// 	this.model.set('layers',[ $layers.first().attr('value') ]);
			// }

			// select default layer if non is selected
			return this;
		},
		bindInputListener: function() {

			var self = this;

			this.$lat().on('change',function(e){
				self.model.set( 'lat', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			});

			this.$lng().on('change',function(e){
				self.model.set( 'lng', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			});

			this.$zoom().on('change',function(e){
				self.model.set( 'zoom', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			});
		},
		bindMapListener: function() {
			this.listenTo( this.model, 'change:lat', this.updateInput );
			this.listenTo( this.model, 'change:lng', this.updateInput );
			this.listenTo( this.model, 'change:zoom', this.updateInput );

		},
		bindListener: function() {
			var self = this;

			this.$returnFormat().on('change',function(e) {
				var layers = self.model.get('layers');
				// map
				self.resetLayers();
				self.model.set('layers',layers);
				self.initLayers();
			});

		},
		unbindInputListener: function() {
			this.$lat().off('change').off('focus').off('blur');
			this.$lng().off('change').off('focus').off('blur');
			this.$zoom().off('change').off('focus').off('blur');
		},
		unbindMapListener: function() {
			this.stopListening( this.model, 'change:lat', this.updateInput );
			this.stopListening( this.model, 'change:lng', this.updateInput );
			this.stopListening( this.model, 'change:zoom', this.updateInput );
		},
		update_visible: function() {
			var prev = this.visible;
			osmField.prototype.update_visible.apply( this, arguments );
			if ( prev !== this.visible ) {
				if ( this.visible ) {
					this.bindInputListener()
				} else {
					this.unbindInputListener()
				}
			}
		}
	});
*/
	// acf.addAction('render_field_object', function(field){
	// 	if ( 'open_street_map' === field.data.type ) {
	//
	// 		//$.acf_leaflet();
	// 	}
	// });

})( jQuery, acf_osm_admin, window );

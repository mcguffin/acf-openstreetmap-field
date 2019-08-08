(function( $, arg, exports ){
	var osm = exports.osm;


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
				center_lat: parseFloat(this.$lat().val() || this.$el.data().mapLat ),
				center_lng: parseFloat(this.$lng().val() || this.$el.data().mapLng ),
				zoom: parseInt(this.$zoom().val() || this.$el.data().mapZoom ),
				layers: this.$el.data().mapLayers,
			};
			return data;
		},
		initialize:function(conf) {
			osmField.prototype.initialize.apply( this, arguments );
			this.bindMapListener();
			this.bindListener();
			
		},
		updateInput: function() {
			this.$lat().val( this.model.get('center_lat') );
			this.$lng().val( this.model.get('center_lng') );
			this.$zoom().val( this.model.get('zoom') );
		},
		initLayers:function() {
			var layers = this.model.get('layers');
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
				self.model.set( 'center_lat', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			})
			;
			this.$lng().on('change',function(e){
				self.model.set( 'center_lng', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			})
			;
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
			this.listenTo( this.model, 'change:center_lat', this.updateInput );
			this.listenTo( this.model, 'change:center_lng', this.updateInput );
			this.listenTo( this.model, 'change:zoom', this.updateInput );

		},
		bindListener: function() {
			var self = this;

			this.$returnFormat().on('change',function(e) {
				var conf = self.$el.data('editor-config'),
					layers = self.model.get('layers');
				// map
				self.resetLayers();
				if ( $(e.target).val() === 'osm' ) {
					// set provider restriction to osm providers
					conf.restrict_providers = Object.values( arg.options.osm_layers );
				} else {
					// set provider restriction to osm providers
					conf.restrict_providers = Object.values( arg.options.leaflet_layers );
				}
				self.$el.data( 'editor-config', conf );
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
			this.stopListening( this.model, 'change:center_lat', this.updateInput );
			this.stopListening( this.model, 'change:center_lng', this.updateInput );
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
	acf.addAction('render_field_object', function(field){
		if ( 'open_street_map' === field.data.type ) {
			$.acf_leaflet();
		}
	});

})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1maWVsZC1ncm91cC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtZmllbGQtZ3JvdXAtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtO1xuXG5cblx0dmFyIG9zbUZpZWxkID0gb3NtLkZpZWxkO1xuXHRvc20uRmllbGQgPSBvc21GaWVsZC5leHRlbmQoe1xuXHRcdCRsYXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdpbnB1dFtpZCQ9XCItY2VudGVyX2xhdFwiXScpO1xuXHRcdH0sXG5cdFx0JGxuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ2lucHV0W2lkJD1cIi1jZW50ZXJfbG5nXCJdJyk7XG5cdFx0fSxcblx0XHQkem9vbTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ2lucHV0W2lkJD1cIi16b29tXCJdJyk7XG5cdFx0fSxcblx0XHQkcmV0dXJuRm9ybWF0OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzJykuZmluZCgnW2RhdGEtbmFtZT1cInJldHVybl9mb3JtYXRcIl0nKTtcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0Y2VudGVyX2xhdDogcGFyc2VGbG9hdCh0aGlzLiRsYXQoKS52YWwoKSB8fCB0aGlzLiRlbC5kYXRhKCkubWFwTGF0ICksXG5cdFx0XHRcdGNlbnRlcl9sbmc6IHBhcnNlRmxvYXQodGhpcy4kbG5nKCkudmFsKCkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcExuZyApLFxuXHRcdFx0XHR6b29tOiBwYXJzZUludCh0aGlzLiR6b29tKCkudmFsKCkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcFpvb20gKSxcblx0XHRcdFx0bGF5ZXJzOiB0aGlzLiRlbC5kYXRhKCkubWFwTGF5ZXJzLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cdFx0XHRvc21GaWVsZC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR0aGlzLmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0dGhpcy5iaW5kTGlzdGVuZXIoKTtcblx0XHRcdFxuXHRcdH0sXG5cdFx0dXBkYXRlSW5wdXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kbGF0KCkudmFsKCB0aGlzLm1vZGVsLmdldCgnY2VudGVyX2xhdCcpICk7XG5cdFx0XHR0aGlzLiRsbmcoKS52YWwoIHRoaXMubW9kZWwuZ2V0KCdjZW50ZXJfbG5nJykgKTtcblx0XHRcdHRoaXMuJHpvb20oKS52YWwoIHRoaXMubW9kZWwuZ2V0KCd6b29tJykgKTtcblx0XHR9LFxuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpO1xuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLmluaXRMYXllcnMuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyICRsYXllcnMgPSAkKCB0aGlzLmxheWVyc0NvbnRyb2wuZ2V0Q29udGFpbmVyKCkgKS5maW5kKCdbdHlwZT1cInJhZGlvXCJdLFt0eXBlPVwiY2hlY2tib3hcIl0nKSxcblx0XHRcdFx0bmFtZSA9IHRoaXMuJHpvb20oKS5hdHRyKCduYW1lJykucmVwbGFjZSgnW3pvb21dJywnW2xheWVyc11bXScpO1xuXHRcdFx0JGxheWVycy5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuXHRcdFx0XHR2YXIgJGVsID0gJChlbCk7XG5cdFx0XHRcdCQoZWwpXG5cdFx0XHRcdFx0LmF0dHIoICduYW1lJywgbmFtZSApXG5cdFx0XHRcdFx0LmF0dHIoICd2YWx1ZScsICRlbC5uZXh0KCkudGV4dCgpLnRyaW0oKSApO1xuXHRcdFx0fSk7XG5cdFx0XHQvLyBpZiAoICEgJGxheWVycy5maW5kKCc6Y2hlY2tlZCcpLmxlbmd0aCApIHtcblx0XHRcdC8vIFx0dGhpcy5tb2RlbC5zZXQoJ2xheWVycycsWyAkbGF5ZXJzLmZpcnN0KCkuYXR0cigndmFsdWUnKSBdKTtcblx0XHRcdC8vIH1cblx0XHRcdFxuXHRcdFx0Ly8gc2VsZWN0IGRlZmF1bHQgbGF5ZXIgaWYgbm9uIGlzIHNlbGVjdGVkXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGJpbmRJbnB1dExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuJGxhdCgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2NlbnRlcl9sYXQnLCAkKGUudGFyZ2V0KS52YWwoKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0O1xuXHRcdFx0dGhpcy4kbG5nKCkub24oJ2NoYW5nZScsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnY2VudGVyX2xuZycsICQoZS50YXJnZXQpLnZhbCgpICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pXG5cdFx0XHQ7XG5cdFx0XHR0aGlzLiR6b29tKCkub24oJ2NoYW5nZScsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnem9vbScsICQoZS50YXJnZXQpLnZhbCgpICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0YmluZE1hcExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6Y2VudGVyX2xhdCcsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6Y2VudGVyX2xuZycsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6em9vbScsIHRoaXMudXBkYXRlSW5wdXQgKTtcblxuXHRcdH0sXG5cdFx0YmluZExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kcmV0dXJuRm9ybWF0KCkub24oJ2NoYW5nZScsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR2YXIgY29uZiA9IHNlbGYuJGVsLmRhdGEoJ2VkaXRvci1jb25maWcnKSxcblx0XHRcdFx0XHRsYXllcnMgPSBzZWxmLm1vZGVsLmdldCgnbGF5ZXJzJyk7XG5cdFx0XHRcdC8vIG1hcFxuXHRcdFx0XHRzZWxmLnJlc2V0TGF5ZXJzKCk7XG5cdFx0XHRcdGlmICggJChlLnRhcmdldCkudmFsKCkgPT09ICdvc20nICkge1xuXHRcdFx0XHRcdC8vIHNldCBwcm92aWRlciByZXN0cmljdGlvbiB0byBvc20gcHJvdmlkZXJzXG5cdFx0XHRcdFx0Y29uZi5yZXN0cmljdF9wcm92aWRlcnMgPSBPYmplY3QudmFsdWVzKCBhcmcub3B0aW9ucy5vc21fbGF5ZXJzICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gc2V0IHByb3ZpZGVyIHJlc3RyaWN0aW9uIHRvIG9zbSBwcm92aWRlcnNcblx0XHRcdFx0XHRjb25mLnJlc3RyaWN0X3Byb3ZpZGVycyA9IE9iamVjdC52YWx1ZXMoIGFyZy5vcHRpb25zLmxlYWZsZXRfbGF5ZXJzICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi4kZWwuZGF0YSggJ2VkaXRvci1jb25maWcnLCBjb25mICk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsYXllcnMnLGxheWVycyk7XG5cdFx0XHRcdHNlbGYuaW5pdExheWVycygpO1xuXHRcdFx0fSk7XG5cblxuXHRcdH0sXG5cdFx0dW5iaW5kSW5wdXRMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiRsYXQoKS5vZmYoJ2NoYW5nZScpLm9mZignZm9jdXMnKS5vZmYoJ2JsdXInKTtcblx0XHRcdHRoaXMuJGxuZygpLm9mZignY2hhbmdlJykub2ZmKCdmb2N1cycpLm9mZignYmx1cicpO1xuXHRcdFx0dGhpcy4kem9vbSgpLm9mZignY2hhbmdlJykub2ZmKCdmb2N1cycpLm9mZignYmx1cicpO1xuXHRcdH0sXG5cdFx0dW5iaW5kTWFwTGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5zdG9wTGlzdGVuaW5nKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmNlbnRlcl9sYXQnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcoIHRoaXMubW9kZWwsICdjaGFuZ2U6Y2VudGVyX2xuZycsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMuc3RvcExpc3RlbmluZyggdGhpcy5tb2RlbCwgJ2NoYW5nZTp6b29tJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdH0sXG5cdFx0dXBkYXRlX3Zpc2libGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHByZXYgPSB0aGlzLnZpc2libGU7XG5cdFx0XHRvc21GaWVsZC5wcm90b3R5cGUudXBkYXRlX3Zpc2libGUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0aWYgKCBwcmV2ICE9PSB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHRcdHRoaXMuYmluZElucHV0TGlzdGVuZXIoKVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMudW5iaW5kSW5wdXRMaXN0ZW5lcigpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXHRhY2YuYWRkQWN0aW9uKCdyZW5kZXJfZmllbGRfb2JqZWN0JywgZnVuY3Rpb24oZmllbGQpe1xuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgPT09IGZpZWxkLmRhdGEudHlwZSApIHtcblx0XHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0XHR9XG5cdH0pO1xuXG59KSggalF1ZXJ5LCBhY2Zfb3NtX2FkbWluLCB3aW5kb3cgKTtcbiJdfQ==

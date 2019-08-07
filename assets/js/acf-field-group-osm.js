(function( $, arg, exports ){
	var osm = exports.osm;


	function getGeo( view ) {
		var inp = getInput( view );
		return {
			center_lat:parseFloat(inp.$lat.val()),
			center_lng:parseFloat(inp.$lng.val()),
			zoom:parseInt(inp.$zoom.val()),
		};
		
	}
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
			return {
				center_lat: parseFloat(this.$lat().val()) || this.$el.data().mapLat,
				center_lng: parseFloat(this.$lng().val()) || this.$el.data().mapLng,
				zoom: parseInt(this.$zoom().val()) || this.$el.data().mapZoom,
				layers: this.$el.data().mapLayers,
			};
		},
		initialize:function(conf) {
			osmField.prototype.initialize.apply( this, arguments );
			this.bindMapListener();
			this.bindListener();
		},
		updateInput: function() {
			this.$lat().val( this.model.get('center_lat').toFixed(6) );
			this.$lng().val( this.model.get('center_lng').toFixed(6) );
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
				self.model.set( 'center_lat', parseFloat( $(e.target).val() ) );
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
				self.model.set( 'center_lng', parseFloat( $(e.target).val() ) );
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
				self.model.set( 'zoom', parseInt( $(e.target).val() ) );
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
	})

	// unbind_events:function() {
	// 	var self = this;
	// 	self.$lat().off('blur');
	// 	self.$lng().off('blur');
	// 	self.$zoom().off('blur');
	// 	self.$zoom().off('keyup focus');
	// 
	// 	this.map.off('zoomend', this.map_zoomed, this );
	// 	this.map.off('moveend', this.map_moved, this );
	// },
	// bind_events: function() {
	// 	var self = this;
	// 
	// 	self.$lat().on('blur',function(e){
	// 		self.update_map();
	// 	});
	// 	self.$lng().on('blur',function(e){
	// 		self.update_map();
	// 	});
	// 	self.$zoom().on('blur',function(e){
	// 		self.update_map();
	// 	});
	// 
	// 	this.map.on('zoomend', this.map_zoomed, this );
	// 	this.map.on('moveend', this.map_moved, this );
	// },


})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1maWVsZC1ncm91cC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtZmllbGQtZ3JvdXAtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtO1xuXG5cblx0ZnVuY3Rpb24gZ2V0R2VvKCB2aWV3ICkge1xuXHRcdHZhciBpbnAgPSBnZXRJbnB1dCggdmlldyApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRjZW50ZXJfbGF0OnBhcnNlRmxvYXQoaW5wLiRsYXQudmFsKCkpLFxuXHRcdFx0Y2VudGVyX2xuZzpwYXJzZUZsb2F0KGlucC4kbG5nLnZhbCgpKSxcblx0XHRcdHpvb206cGFyc2VJbnQoaW5wLiR6b29tLnZhbCgpKSxcblx0XHR9O1xuXHRcdFxuXHR9XG5cdHZhciBvc21GaWVsZCA9IG9zbS5GaWVsZDtcblx0b3NtLkZpZWxkID0gb3NtRmllbGQuZXh0ZW5kKHtcblx0XHQkbGF0OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzJykuZmluZCgnaW5wdXRbaWQkPVwiLWNlbnRlcl9sYXRcIl0nKTtcblx0XHR9LFxuXHRcdCRsbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdpbnB1dFtpZCQ9XCItY2VudGVyX2xuZ1wiXScpO1xuXHRcdH0sXG5cdFx0JHpvb206IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdpbnB1dFtpZCQ9XCItem9vbVwiXScpO1xuXHRcdH0sXG5cdFx0JHJldHVybkZvcm1hdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ1tkYXRhLW5hbWU9XCJyZXR1cm5fZm9ybWF0XCJdJyk7XG5cdFx0fSxcblx0XHRnZXRNYXBEYXRhOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y2VudGVyX2xhdDogcGFyc2VGbG9hdCh0aGlzLiRsYXQoKS52YWwoKSkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcExhdCxcblx0XHRcdFx0Y2VudGVyX2xuZzogcGFyc2VGbG9hdCh0aGlzLiRsbmcoKS52YWwoKSkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcExuZyxcblx0XHRcdFx0em9vbTogcGFyc2VJbnQodGhpcy4kem9vbSgpLnZhbCgpKSB8fCB0aGlzLiRlbC5kYXRhKCkubWFwWm9vbSxcblx0XHRcdFx0bGF5ZXJzOiB0aGlzLiRlbC5kYXRhKCkubWFwTGF5ZXJzLFxuXHRcdFx0fTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24oY29uZikge1xuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdHRoaXMuYmluZExpc3RlbmVyKCk7XG5cdFx0fSxcblx0XHR1cGRhdGVJbnB1dDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiRsYXQoKS52YWwoIHRoaXMubW9kZWwuZ2V0KCdjZW50ZXJfbGF0JykudG9GaXhlZCg2KSApO1xuXHRcdFx0dGhpcy4kbG5nKCkudmFsKCB0aGlzLm1vZGVsLmdldCgnY2VudGVyX2xuZycpLnRvRml4ZWQoNikgKTtcblx0XHRcdHRoaXMuJHpvb20oKS52YWwoIHRoaXMubW9kZWwuZ2V0KCd6b29tJykgKTtcblx0XHR9LFxuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpO1xuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLmluaXRMYXllcnMuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyICRsYXllcnMgPSAkKCB0aGlzLmxheWVyc0NvbnRyb2wuZ2V0Q29udGFpbmVyKCkgKS5maW5kKCdbdHlwZT1cInJhZGlvXCJdLFt0eXBlPVwiY2hlY2tib3hcIl0nKSxcblx0XHRcdFx0bmFtZSA9IHRoaXMuJHpvb20oKS5hdHRyKCduYW1lJykucmVwbGFjZSgnW3pvb21dJywnW2xheWVyc11bXScpO1xuXHRcdFx0JGxheWVycy5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuXHRcdFx0XHR2YXIgJGVsID0gJChlbCk7XG5cdFx0XHRcdCQoZWwpXG5cdFx0XHRcdFx0LmF0dHIoICduYW1lJywgbmFtZSApXG5cdFx0XHRcdFx0LmF0dHIoICd2YWx1ZScsICRlbC5uZXh0KCkudGV4dCgpLnRyaW0oKSApO1xuXHRcdFx0fSk7XG5cdFx0XHQvLyBpZiAoICEgJGxheWVycy5maW5kKCc6Y2hlY2tlZCcpLmxlbmd0aCApIHtcblx0XHRcdC8vIFx0dGhpcy5tb2RlbC5zZXQoJ2xheWVycycsWyAkbGF5ZXJzLmZpcnN0KCkuYXR0cigndmFsdWUnKSBdKTtcblx0XHRcdC8vIH1cblx0XHRcdFxuXHRcdFx0Ly8gc2VsZWN0IGRlZmF1bHQgbGF5ZXIgaWYgbm9uIGlzIHNlbGVjdGVkXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGJpbmRJbnB1dExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuJGxhdCgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2NlbnRlcl9sYXQnLCBwYXJzZUZsb2F0KCAkKGUudGFyZ2V0KS52YWwoKSApICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pXG5cdFx0XHQ7XG5cdFx0XHR0aGlzLiRsbmcoKS5vbignY2hhbmdlJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdjZW50ZXJfbG5nJywgcGFyc2VGbG9hdCggJChlLnRhcmdldCkudmFsKCkgKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0O1xuXHRcdFx0dGhpcy4kem9vbSgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ3pvb20nLCBwYXJzZUludCggJChlLnRhcmdldCkudmFsKCkgKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGJpbmRNYXBMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmNlbnRlcl9sYXQnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmNlbnRlcl9sbmcnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOnpvb20nLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cblx0XHR9LFxuXHRcdGJpbmRMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJHJldHVybkZvcm1hdCgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGNvbmYgPSBzZWxmLiRlbC5kYXRhKCdlZGl0b3ItY29uZmlnJyksXG5cdFx0XHRcdFx0bGF5ZXJzID0gc2VsZi5tb2RlbC5nZXQoJ2xheWVycycpO1xuXHRcdFx0XHQvLyBtYXBcblx0XHRcdFx0c2VsZi5yZXNldExheWVycygpO1xuXHRcdFx0XHRpZiAoICQoZS50YXJnZXQpLnZhbCgpID09PSAnb3NtJyApIHtcblx0XHRcdFx0XHQvLyBzZXQgcHJvdmlkZXIgcmVzdHJpY3Rpb24gdG8gb3NtIHByb3ZpZGVyc1xuXHRcdFx0XHRcdGNvbmYucmVzdHJpY3RfcHJvdmlkZXJzID0gT2JqZWN0LnZhbHVlcyggYXJnLm9wdGlvbnMub3NtX2xheWVycyApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHNldCBwcm92aWRlciByZXN0cmljdGlvbiB0byBvc20gcHJvdmlkZXJzXG5cdFx0XHRcdFx0Y29uZi5yZXN0cmljdF9wcm92aWRlcnMgPSBPYmplY3QudmFsdWVzKCBhcmcub3B0aW9ucy5sZWFmbGV0X2xheWVycyApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYuJGVsLmRhdGEoICdlZGl0b3ItY29uZmlnJywgY29uZiApO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbGF5ZXJzJyxsYXllcnMpO1xuXHRcdFx0XHRzZWxmLmluaXRMYXllcnMoKTtcblx0XHRcdH0pO1xuXG5cblx0XHR9LFxuXHRcdHVuYmluZElucHV0TGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kbGF0KCkub2ZmKCdjaGFuZ2UnKS5vZmYoJ2ZvY3VzJykub2ZmKCdibHVyJyk7XG5cdFx0XHR0aGlzLiRsbmcoKS5vZmYoJ2NoYW5nZScpLm9mZignZm9jdXMnKS5vZmYoJ2JsdXInKTtcblx0XHRcdHRoaXMuJHpvb20oKS5vZmYoJ2NoYW5nZScpLm9mZignZm9jdXMnKS5vZmYoJ2JsdXInKTtcblx0XHR9LFxuXHRcdHVuYmluZE1hcExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuc3RvcExpc3RlbmluZyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpjZW50ZXJfbGF0JywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdFx0dGhpcy5zdG9wTGlzdGVuaW5nKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmNlbnRlcl9sbmcnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcoIHRoaXMubW9kZWwsICdjaGFuZ2U6em9vbScsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBwcmV2ID0gdGhpcy52aXNpYmxlO1xuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLnVwZGF0ZV92aXNpYmxlLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdGlmICggcHJldiAhPT0gdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0XHR0aGlzLmJpbmRJbnB1dExpc3RlbmVyKClcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnVuYmluZElucHV0TGlzdGVuZXIoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9KVxuXG5cdC8vIHVuYmluZF9ldmVudHM6ZnVuY3Rpb24oKSB7XG5cdC8vIFx0dmFyIHNlbGYgPSB0aGlzO1xuXHQvLyBcdHNlbGYuJGxhdCgpLm9mZignYmx1cicpO1xuXHQvLyBcdHNlbGYuJGxuZygpLm9mZignYmx1cicpO1xuXHQvLyBcdHNlbGYuJHpvb20oKS5vZmYoJ2JsdXInKTtcblx0Ly8gXHRzZWxmLiR6b29tKCkub2ZmKCdrZXl1cCBmb2N1cycpO1xuXHQvLyBcblx0Ly8gXHR0aGlzLm1hcC5vZmYoJ3pvb21lbmQnLCB0aGlzLm1hcF96b29tZWQsIHRoaXMgKTtcblx0Ly8gXHR0aGlzLm1hcC5vZmYoJ21vdmVlbmQnLCB0aGlzLm1hcF9tb3ZlZCwgdGhpcyApO1xuXHQvLyB9LFxuXHQvLyBiaW5kX2V2ZW50czogZnVuY3Rpb24oKSB7XG5cdC8vIFx0dmFyIHNlbGYgPSB0aGlzO1xuXHQvLyBcblx0Ly8gXHRzZWxmLiRsYXQoKS5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdC8vIFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0Ly8gXHR9KTtcblx0Ly8gXHRzZWxmLiRsbmcoKS5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdC8vIFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0Ly8gXHR9KTtcblx0Ly8gXHRzZWxmLiR6b29tKCkub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHQvLyBcdFx0c2VsZi51cGRhdGVfbWFwKCk7XG5cdC8vIFx0fSk7XG5cdC8vIFxuXHQvLyBcdHRoaXMubWFwLm9uKCd6b29tZW5kJywgdGhpcy5tYXBfem9vbWVkLCB0aGlzICk7XG5cdC8vIFx0dGhpcy5tYXAub24oJ21vdmVlbmQnLCB0aGlzLm1hcF9tb3ZlZCwgdGhpcyApO1xuXHQvLyB9LFxuXG5cbn0pKCBqUXVlcnksIGFjZl9vc21fYWRtaW4sIHdpbmRvdyApO1xuIl19

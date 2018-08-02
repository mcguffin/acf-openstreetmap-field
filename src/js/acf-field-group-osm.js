(function($){
	var options = acf_osm_field_group.options;

	var osmReturnFormat = acf.FieldSetting.extend({
		type: 'open_street_map',
		name: 'return_format',

		val: function( val ) {
			if ( 'undefined' === typeof val ) {
				return this.$el.find(':checked').val();
			}
			this.$el.find('[value="'+val+'"]').prop( 'checked', true );
		},
		render:function(e){
			this.$el.closest('.acf-field-object').attr('data-return-format',this.val());
		}
	});
	acf.registerFieldSetting(osmReturnFormat);

	/**
	 *
	 */
	var osmDefaultLayers = acf.FieldSetting.extend({
		type: 'open_street_map',
		name: 'default_leaflet_layers',
		events: {
			'click .choices .acf-rel-item:not(.disabled)'	: 'add_item',
			'click .values [data-name="remove_item"]'	: 'remove_item',
			'stop .ui-sortable'	: 'render',
			'change'	: 'onChange'
		},
		render:function() {
			this.$valuesList().sortable();
		},
		$hidden:function(){
			return this.$el.find('[type="hidden"]').first();
		},
		$choice:function( val ){
			return this.$el.find('.choices-list [data-id="'+val+'"]').closest('li');
		},
		$valuesList:function(){
			return this.$el.find('.values-list');
		},
		add_item: function(e) {
			//this.$choice()
			var $clone = $(e.target).closest('li').clone();
			// add del
			$clone
				.appendTo( this.$valuesList() )
				.prepend( '<input type="hidden" name="'+this.$hidden().attr('name')+'" value="'+$(e.target).attr('data-id')+'" />' )
				.find('[data-id]')
				.append( '<a href="#" class="acf-icon -minus small dark" data-name="remove_item"></a>' )
				;

			$(e.target).addClass('disabled');
			this.trigger('change')
		},
		remove_item: function(e) {
			var val = $(e.target).closest('[data-id]').attr('data-id')
				$choice = this.$choice( val ),
				$item = $(e.target).closest('li');

			$choice.find('[data-id]').removeClass('disabled');
			$item.remove();
			this.trigger('change')
		},
		get_val:function(){
			var vals = [];
			this.$valuesList().find('[type="hidden"]').each(function(){
				vals.push($(this).val());
			});
			return vals;
		},
		onChange:function(){
			this.fieldObject.setProp( this.name,this.get_val() );
			this.fieldObject.save();
		}
	});
	acf.registerFieldSetting(osmDefaultLayers);


})(jQuery);

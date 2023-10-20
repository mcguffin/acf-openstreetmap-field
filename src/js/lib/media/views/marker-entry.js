import $ from 'jquery';

const { options, i18n } = acf_osm_admin

class MarkerEntry extends wp.Backbone.View.extend({
	tagName:  'div',
	className: 'osm-marker',
	template: wp.template('osm-marker-input'),
	events:  {
		'click [data-name="locate-marker"]' : 'locate_marker',
		'click [data-name="remove-marker"]' : 'remove_marker',
		'change [data-name="label"]'		: 'update_marker_label',
	}
}) {

	initialize( opt ) {
		super.render(...Array.from(arguments))

		this.marker = opt.marker; // leaflet marker
		this.marker.osm_controller = this;
		this.model = opt.model;
		this.listenTo( this.model, 'change:label', this.changedLabel );
		this.listenTo( this.model, 'change:default_label', this.changedDefaultLabel );
		this.listenTo( this.model, 'change:lat', this.changedlatLng );
		this.listenTo( this.model, 'change:lng', this.changedlatLng );
		this.listenTo( this.model, 'destroy', this.remove );

		return this.render();
	}

	changedLabel() {
		const label = this.model.get('label');
		this.$('[data-name="label"]').val( label ).trigger('change');

		this.marker.unbindTooltip();
		this.marker.bindTooltip(label);

		this.marker.options.title = label;

		$( this.marker._icon ).attr( 'title', label );
	}

	changedDefaultLabel() {
		// update label too, if
		if ( this.model.get('label') === this.model.previous('default_label') ) {
			this.model.set('label', this.model.get('default_label') );
		}
	}

	changedlatLng() {
		this.marker.setLatLng( { lat:this.model.get('lat'), lng:this.model.get('lng') } )
	}

	render() {
		super.render(...Array.from(arguments))

		// wp.media.View.prototype.render.apply(this,arguments);
		this.$el.find('[data-name="label"]')
			.on('focus', e => {
				this.hilite_marker();
			})
			.on('blur', e => {
				this.lolite_marker();
			})
			.val( this.model.get('label') ).trigger('change');
		$(this.marker._icon)
			.on('focus', e => {
				this.hilite_marker();
			})
			.on('blur', e => {
				this.lolite_marker();
			})
		return this;
	}

	update_marker_label(e) {
		let label = $(e.target).val();
		if ( '' === label ) {
			label = this.model.get('default_label');
		}
		this.model.set('label', label );
		return this;
	}

	update_marker_geocode( label ) {

		if ( this.model.isDefaultLabel() ) {
			// update marker labels
			this.set_marker_label( label );
			// update marker label input
		}

		this.$el.find('[id$="-marker-geocode"]').val( label ).trigger('change');

		this._update_values_from_marker();

		return this;
	}

	_update_values_from_marker( ) {
		const latlng = this.marker.getLatLng();
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
	}

	hilite_marker(e) {
		this.$el.addClass('focus');
		$( this.marker._icon ).addClass('focus')
	}

	lolite_marker(e) {
		this.$el.removeClass('focus');
		$( this.marker._icon ).removeClass('focus')
	}

	locate_marker(){
		this.marker._map.flyTo( this.marker.getLatLng() );
		return this;
	}

	remove_marker(e) {
		// click remove
		e.preventDefault();
		this.model.destroy(); //
		return this;
	}

	pling() {
		$(this.marker._icon).html('').append('<span class="pling"></span>');
	}
}
module.exports = MarkerEntry

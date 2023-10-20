// import $ from 'jquery';

(function($){

	const classPrefix = 'osm-sync-'

	const osmRepeaters = {}

	const getKey = field => {
		const cls = field.$el.attr('class').split(' ')
			.find( c => c.indexOf(classPrefix) === 0 )
		return !! cls ? cls.substr( classPrefix.length ) : false
	}

	const registerRepeater = repeater => {
		const key = getKey( repeater )
		if ( false === key ) {
			return
		}
		if ( ! osmRepeaters[key] ) {
			osmRepeaters[key] = {}
		}
		osmRepeaters[key].repeater = repeater
	}
	const registerOSM = osm => {
		const key = getKey( osm )
		if ( false === key ) {
			return
		}
		if ( ! osmRepeaters[key] ) {
			osmRepeaters[key] = {}
		}
		osmRepeaters[key].osm = osm
	}

	const getRepeater = osm => {
		const key = getKey( osm )
		if ( false === key ) {
			return false
		}
		const $parent = osm.$el.parent()
		const fieldKey = $parent.find(`.${classPrefix}${key}[data-type="repeater"]`).attr('data-key')
		const $field = acf.findField( fieldKey, $parent )
		return $field.data('acf')
	}
	const getRepeaterRow = ( uuid, repeater ) => {
		const inp = repeater.$el
			.find('.acf-field[data-name="uuid"]')
			.filter( (i,el) => {
				const field = acf.findField( el.getAttribute('data-key'), $(el.parentNode) ).data('acf')
				return !! field && field.getValue() === uuid
			} )

		return inp.length
			? inp.closest('.acf-row')
			: false
	}
	const getOSM = repeater => {
		const key = getKey( repeater )
		if ( false === key ) {
			return false
		}
		const $parent = repeater.$el.parent()
		const fieldKey = $parent.find(`.${classPrefix}${key}[data-type="open_street_map"]`).attr('data-key')
		const $field = acf.findField( fieldKey, $parent )
		return $field.data('acf')
	}
	const getOSMMarkerModel = ( uuid, osm ) => {
		return osm.get('osmEditor').model.get('markers').findWhere( { 'uuid': uuid } )
	}

	const getFieldByName = ( name, $parent ) => {
		const key = $parent.find(`[data-name="${name}"]`).attr('data-key')
		return acf.findField( key, $parent ).data('acf')
	}

	// override repeater type to fire actions on add/remove
	const repeaterType = acf.getFieldType('repeater')
	acf.registerFieldType( repeaterType.extend({
		duplicateRow:function($row) {
			const result = repeaterType.prototype.duplicateRow.apply( this, [ $row ] )
			acf.doAction( 'acf-osm/repeater/add', this, result )
			return result
		},
		add: function(args) {
			const result = repeaterType.prototype.add.apply( this, [ args ] )
			args = acf.parseArgs(args, {
				suppressFilters: false
			});
			if ( ! args.suppressFilters ) {
				acf.doAction( 'acf-osm/repeater/add', this, result )
			}
			return result
		},
		remove: function($row, args) {
			args = acf.parseArgs(args, {
				suppressFilters: false
			});
			if ( ! args.suppressFilters ) {
				acf.doAction( 'acf-osm/repeater/remove', this, $row )
			}
			return repeaterType.prototype.remove.apply( this, [$row ])
		}
	}) )


	acf.addAction('acf-osm/repeater/add', function( repeater, $row ) {

		const osm = getOSM(repeater)

		if ( ! osm ) {
			return
		}

		const editor = osm.get('osmEditor')
		const markerData = {
			label: '',
			default_label: '',
			lat: editor.model.get('lat'),
			lng: editor.model.get('lng'),
			geocode: [],
			uuid: acf.uniqid('marker_'),
		}

		const marker = editor.model.get('markers').add( markerData )
		editor.reverseGeocode( marker )

		getFieldByName( 'uuid',$row ).setValue( markerData.uuid )
		getFieldByName( 'lat',$row ).setValue( markerData.lat )
		getFieldByName( 'lng',$row ).setValue( markerData.lng )

	})

	acf.addAction('acf-osm/repeater/remove', function( repeater, $row ) {
		const osm = getOSM(repeater)
		if ( ! osm ) {
			return
		}
		const uuid = getFieldByName( 'uuid',$row ).getValue()
		const model = getOSMMarkerModel( uuid, osm )
		!! model && model.destroy()
	})


	acf.addAction('acf-osm/create-marker', function( markerModel, osm ) {
		// add repeater entry
		const repeater = getRepeater( osm )
		if ( ! repeater ) {
			return
		}
		const $row = getRepeater( osm ).add( { suppressFilters: true } )

		acf.newField( $row.find('[data-name="uuid"]') ).setValue( markerModel.get('uuid') )

		acf.doAction( 'acf-osm/update-marker-latlng', markerModel, osm )

	} );
	acf.addAction('acf-osm/destroy-marker', function( markerModel, osm ) {

		const repeater = getRepeater( osm )
		if ( ! repeater ) {
			return
		}
		const $row = getRepeaterRow( markerModel.get('uuid'), repeater )
		!! $row && repeater.remove( $row, { suppressFilters: true } )

	} );
	acf.addAction('acf-osm/update-marker-latlng', function( markerModel, osm ) {

		const repeater = getRepeater( osm )
		if ( ! repeater ) {
			return
		}
		const $row = getRepeaterRow( markerModel.get('uuid'), repeater )

		const latField = acf.newField( $row.find('[data-name="lat"]') )
		const lngField = acf.newField( $row.find('[data-name="lng"]') )
		!! latField && latField.setValue( markerModel.get('lat') )
		!! lngField && lngField.setValue( markerModel.get('lng') )

	} );

	acf.addAction('acf-osm/marker-geocode-result', function( markerModel, osm, geocodeResult, prevGeocodeResult ) {
		//

		const repeater = getRepeater( osm )
		if ( ! repeater ) {
			return
		}
		const $row = getRepeaterRow( markerModel.get('uuid'), repeater )
		if ( ! $row ) {
			return
		}

		const newAddress = geocodeResult.length ? geocodeResult[0].properties.address : false
		const oldAddress = prevGeocodeResult.length ? prevGeocodeResult[0].properties.address : false
		const map = {
			'name'           : address => !! address.amenity ? address.amenity.trim() : '',
			'address_line_1' : address => `${address.road} ${address.house_number}`.trim(),
			'address_line_2' : address => '',
			'zip'            : address => address.postcode ? address.postcode.trim() : '',
			'city'           : address => !! address
				? [ address.city, address.town, address.village, address.hamlet ].filter( el => !!el )[0].trim()
				: '',
			'country_code'   : address => !! address.country_code
				? address.country_code.toUpperCase()
				: '',
		}

		Object.keys(map).map( fieldname => {
			const field = getFieldByName( fieldname, $row )
			const value = field.getValue().trim()
			const oldValue = oldAddress ? map[fieldname]( oldAddress ) : false
			const newValue = map[fieldname]( newAddress )

			if ( false === newAddress ) {
				return
			}
			if ( '' === value || value === oldValue ) {
				field.setValue( newValue )
			}
		})
		// fill empty fields with geocode result
	} );
})(jQuery)

// TODO: Conditionals
const hasMarkers = acf.Condition.extend({
	type:       'hasMarkers',
	label:      acf.__('Has markers'),
	operator:   '?markers',
	fieldTypes: ['open_street_map'],
	match:      (rule,field) => {
		return field.countMarkers() > 0
	},
	choices:    fieldObject => {
		return '<input type="text" disabled="" />';
	}
})
const hasNoMarkers = acf.Condition.extend({
	type:       'hasNoMarkers',
	label:      acf.__('Has no markers'),
	operator:   '!markers',
	fieldTypes: ['open_street_map'],
	match:      (rule,field) => {
		return field.countMarkers() === 0
	},
	choices:    fieldObject => {
		return '<input type="text" disabled="" />';
	}
})
const ltMarkers = acf.Condition.extend({
	type:       'ltMarkers',
	label:      acf.__('Has less than … markers'),
	operator:   '<markers',
	fieldTypes: ['open_street_map'],
	match:      (rule,field) => {
		return field.countMarkers() < parseInt( rule.value )
	},
	choices:    fieldObject => {
		return '<input type="number" />';
	}
})
const numMarkers = acf.Condition.extend({
	type:       'numMarkers',
	label:      acf.__('Has exactly … markers'),
	operator:   '=markers',
	fieldTypes: ['open_street_map'],
	match:      (rule,field) => {
		return field.countMarkers() === parseInt( rule.value )
	},
	choices:    fieldObject => {
		return '<input type="number" />';
	}
})
const gtMarkers = acf.Condition.extend({
	type:        'gtMarkers',
	label:      acf.__('Has more than … markers'),
	operator:   '>markers',
	fieldTypes: ['open_street_map'],
	match:      (rule,field) => {
		return field.countMarkers() > parseInt( rule.value )
	},
	choices:    fieldObject => {
		return '<input type="number" />';
	}
})

const hemisphere = acf.Condition.extend({
	type:       'hemisphere',
	label:      acf.__('Hemisphere is'),
	operator:   'map_hemisphere',
	fieldTypes: ['open_street_map'],
	match:      (rule,field) => {
		const map = field.getMapValue()
		if ( 'n' === rule.value ) {
			return map.lat > 0
		} else if ( 's' === rule.value ) {
			return map.lat < 0
		} else if ( 'e' === rule.value ) {
			return map.lng > 0
		} else if ( 'w' === rule.value ) {
			return map.lng < 0
		}
		return false
	},
	choices:    fieldObject => {
		return [
			{
				id:   'n',
				text: acf.__('North')
			},
			{
				id:   'e',
				text: acf.__('East')
			},
			{
				id:   's',
				text: acf.__('South')
			},
			{
				id:   'w',
				text: acf.__('West')
			},
		];
	}
})

acf.registerConditionType( hasMarkers )
acf.registerConditionType( hasNoMarkers )
acf.registerConditionType( ltMarkers )
acf.registerConditionType( numMarkers )
acf.registerConditionType( gtMarkers )
acf.registerConditionType( hemisphere )

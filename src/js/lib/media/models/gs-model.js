const { accuracy } = acf_osm_admin.options

const fixedFloatGetter = function( prop, fix ) {
	return function() {
		return parseFloat( this.attributes[ prop ] );
	}
}
const fixedFloatSetter = function( prop, fix ) {
	return function(value) {
		return parseFloat(parseFloat(value).toFixed(fix) );
	}
}
const intGetter = function(prop) {
	return function() {
		return parseInt( this.attributes[ prop ] );
	}
}
const intSetter = function(prop) {
	return function(value) {
		return parseInt( value );
	}
}

const GSModel = Backbone.Model.extend({

	get: function( attr ) {
		// Call the getter if available
		if (_.isFunction(this.getters[attr])) {
			return this.getters[attr].call(this);
		}

		return Backbone.Model.prototype.get.call(this, attr);
	},

	set: function( key, value, options ) {
		let attrs, attr;

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

module.exports = { GSModel, intGetter, intSetter, fixedFloatGetter, fixedFloatSetter, accuracy }

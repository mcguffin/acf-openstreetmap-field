import L from 'leaflet/no-conflict';

// Stolen from https://github.com/leaflet-extras/leaflet-providers/blob/master/leaflet-providers.js
const Provider = L.TileLayer.extend({
	initialize: function (arg, options) {

		const { providers } = L.TileLayer.Provider;

		const [ providerName, variantName ] = arg.split('.');

		if ( ! providers[providerName] ) {
			throw 'No such provider (' + providerName + ')';
		}

		if ( acf_osm.providers[providerName].constructor !== {}.constructor ) {
			throw 'Invalid provider (' + providerName + ')';
		}

		const provider = {
			url: providers[providerName].url,
			options: providers[providerName].options,
		};
		this.providerKey = arg
		this.overlay     = providers[providerName].isOverlay??false

		// overwrite values in provider from variant.
		if ( variantName && 'variants' in providers[providerName] ) {
			if (!(variantName in providers[providerName].variants)) {
				throw 'No such variant of ' + providerName + ' (' + variantName + ')';
			}
			const variant = providers[providerName].variants[variantName];
			const variantOptions = {};
			if (typeof variant === 'string') {
				variantOptions.variant = variant
			} else {
				Object.assign( variantOptions, variant.options );
			}
			provider.url     = variant.url || provider.url
			provider.options = Object.assign({}, provider.options, variantOptions)
			this.overlay = variant.isOverlay ?? this.overlay
		}

		// replace attribution placeholders with their values from toplevel provider attribution,
		// recursively
		const attributionReplacer = attr => {
			if (attr.indexOf('{attribution.') === -1) {
				return attr;
			}
			return attr.replace(/\{attribution.(\w*)\}/g,
				function (match, attributionName) {
					return attributionReplacer(providers[attributionName].options.attribution);
				}
			);
		};
		provider.options.attribution = attributionReplacer(provider.options.attribution);

		// Compute final options combining provider options with any user overrides
		// replace time, timeStamp with
		L.TileLayer.prototype.initialize.call(
			this,
			provider.url,
			Object.assign( {}, provider.options, options )
		);
	}
});

Provider.providers = acf_osm.providers //console.log()

L.TileLayer.Provider = Provider

L.tileLayer.provider = function ( provider, options ) {
	return new Provider(provider, options);
};

module.exports = Provider

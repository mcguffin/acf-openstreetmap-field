/**
 * 
 */

import { L } from 'osm-map';

const { options, i18n } = acf_osm_admin

class GeocoderFactory {

    static createGeocoder(options) {

        console.debug('GeocoderFactory.createGeocoder()', options.geocoder_name, options.geocoder_options);

        /**
         * Do not forget to sync those values with \ACFFieldOpenstreetmap\Core\Core:GEOCODERS
         */
        switch (options.geocoder_name) {
            case 'Nominatim':
                return GeocoderFactory.useNominatim(options.geocoder_options);
            case 'Photon':
                return GeocoderFactory.usePhoton(options.geocoder_options);
            case 'OpenCage':
                return GeocoderFactory.useOpenCage(options.geocoder_options);
            //case 'openrouteservice':
            //    return GeocoderFactory.useOpenrouteservice(options);
        }
        return null;
    }

    static useNominatim(options) {
        const nominatim_options = Object.assign({
            // geocodingQueryParams: {'accept-language':'it'},
            // reverseQueryParams: {'accept-language':'it'},
            htmlTemplate: result => {
                var parts = [],
                    templateConfig = {
                        interpolate: /\{(.+?)\}/g
                    },
                    addr = _.defaults(result.address, {
                        building: '',
                        road: '',
                        house_number: '',

                        postcode: '',
                        city: '',
                        town: '',
                        village: '',
                        hamlet: '',

                        state: '',
                        country: '',
                    });

                parts.push(_.template(i18n.address_format.street, templateConfig)(addr));
                parts.push(_.template(i18n.address_format.city, templateConfig)(addr));
                parts.push(_.template(i18n.address_format.country, templateConfig)(addr));

                return parts
                    .map(el => el.replace(/\s+/g, ' ').trim())
                    .filter(el => el !== '')
                    .join(', ')
            }
        }, options);

        const gc = L.Control.Geocoder.nominatim(nominatim_options)
        return gc;

    }

    /**
     * https://www.liedman.net/leaflet-control-geocoder/docs/classes/geocoders.OpenCage.html#options
     * @param {*} options 
     * @returns 
     */
    static useOpenCage(options) {
        const oc_options = Object.assign({
        }, options);
        const gc = L.Control.Geocoder.opencage(oc_options);
        return gc;
    }

    static usePhoton(options) {
        const photon_options = Object.assign({
            htmlTemplate: result => {
                var parts = [],
                    templateConfig = {
                        interpolate: /\{(.+?)\}/g
                    },
                    addr = _.defaults(result.address, {
                        building: '',
                        road: '',
                        house_number: '',

                        postcode: '',
                        city: '',
                        town: '',
                        village: '',
                        hamlet: '',

                        state: '',
                        country: '',
                    });

                parts.push(_.template(i18n.address_format.street, templateConfig)(addr));
                parts.push(_.template(i18n.address_format.city, templateConfig)(addr));
                parts.push(_.template(i18n.address_format.country, templateConfig)(addr));

                return parts
                    .map(el => el.replace(/\s+/g, ' ').trim())
                    .filter(el => el !== '')
                    .join(', ')
            }

        }, options);

        const gc = L.Control.Geocoder.photon(photon_options)
        return gc;
    }

}

export { GeocoderFactory }

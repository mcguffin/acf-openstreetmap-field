import {L} from 'osm-map';

const { i18n } = acf_osm_admin

class Geocoder {

    static resolveAndConfigure(which, options )
    {
        console.debug('Geocoder.resolveAndConfigure()', 'which', which);
        switch( which )
        {
            case 'nominatim':
                return Geocoder.useNominatim( options );
            case 'photon':
                return Geocoder.usePhoton( options );
        }
        return null ;
    }

    static useNominatim( options )
    {
        const nominatim_options = Object.assign( {
            // geocodingQueryParams: {'accept-language':'it'},
            // reverseQueryParams: {'accept-language':'it'},
            htmlTemplate: result => {
                var parts = [],
                    templateConfig = {
                        interpolate: /\{(.+?)\}/g
                    },
                    addr = _.defaults( result.address, {
                        building:'',
                        road:'',
                        house_number:'',

                        postcode:'',
                        city:'',
                        town:'',
                        village:'',
                        hamlet:'',

                        state:'',
                        country:'',
                    } );

                parts.push( _.template( i18n.address_format.street, templateConfig )( addr ) );
                parts.push( _.template( i18n.address_format.city, templateConfig )( addr ) );
                parts.push( _.template( i18n.address_format.country, templateConfig )( addr ) );

                return parts
                    .map( el =>  el.replace(/\s+/g,' ').trim() )
                    .filter( el => el !== '' )
                    .join(', ')
            }
        }, options.nominatim);

        const gc = L.Control.Geocoder.nominatim( nominatim_options )
        return gc ;

    }

    static usePhoton( options )
    {
        const photon_options = Object.assign( {
            htmlTemplate: result => {
                var parts = [],
                    templateConfig = {
                        interpolate: /\{(.+?)\}/g
                    },
                    addr = _.defaults( result.address, {
                        building:'',
                        road:'',
                        house_number:'',

                        postcode:'',
                        city:'',
                        town:'',
                        village:'',
                        hamlet:'',

                        state:'',
                        country:'',
                    } );

                parts.push( _.template( i18n.address_format.street, templateConfig )( addr ) );
                parts.push( _.template( i18n.address_format.city, templateConfig )( addr ) );
                parts.push( _.template( i18n.address_format.country, templateConfig )( addr ) );

                return parts
                    .map( el =>  el.replace(/\s+/g,' ').trim() )
                    .filter( el => el !== '' )
                    .join(', ')
            }

        }, options.photon );

        const gc = L.Control.Geocoder.photon( photon_options )
        return gc ;
    }

}

export {Geocoder}

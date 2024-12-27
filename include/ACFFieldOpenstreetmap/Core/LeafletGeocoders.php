<?php

namespace ACFFieldOpenstreetmap\Core;

use ACFFieldOpenstreetmap\Helper;

class LeafletGeocoders extends Singleton
{
    const GEOCODER_NOMINATIM = 'Nominatim';
    const GEOCODER_PHOTON = 'Photon';
    const GEOCODER_OPENCAGE = 'OpenCage';
    const GEOCODER_DEFAUlT = self::GEOCODER_NOMINATIM;
    const GEOCODERS = [self::GEOCODER_NOMINATIM, self::GEOCODER_PHOTON, self::GEOCODER_OPENCAGE];

    /** @var array */
    private $geocoders = null;

    public function get_geocoders()
    {
        if ($this->geocoders !== null )
            return $this->geocoders;

        $core = Core::instance();
        $this->geocoders = json_decode($core->read_file('etc/leaflet-control-geocoders.json'), true);        

        return $this->geocoders;
    }

    /**
     * Is an API key mandatory ?
     * @param string $geocoder_name 
     * @return bool 
     */
    public function is_apikey_mandatory($geocoder_name)
    {
        $geocoders = $this->get_geocoders();
        // Retrive default options
        $options = $geocoders[$geocoder_name]['options'];
        if( isset($options['apiKeyMandatory']) )
            return boolval($options['apiKeyMandatory']);
        return false ;
    }

    public function get_options($geocoder_name)
    {
        $geocoders = $this->get_geocoders();
        // Retrive default options
        $options = $geocoders[$geocoder_name]['options'];

        // Enriches the options specifically for each geocoder
        switch ($geocoder_name) {

            case self::GEOCODER_NOMINATIM:
                /**
                 *  Nominatim options.
                 * 
                 * - Address search @see https://nominatim.org/release-docs/develop/api/Search/
                 * - Reverse geocoding @see https://nominatim.org/release-docs/develop/api/Reverse/
                 * - Leaflet control @see https://github.com/perliedman/leaflet-control-geocoder/blob/master/src/geocoders/nominatim.ts
                 */

                $language = substr(get_locale(), 0, 2);
                $this->addGeocodingQueryParams($options, 'accept-language', $language);
                $this->addReverseQueryParams($options, 'accept-language', $language);

                $options = apply_filters('acf_osm_nominatim_options', $options);
                break;

            case self::GEOCODER_PHOTON:
                /**
                 *	Photon options.
                 *
                 * Allowed parameters are: [q, location_bias_scale, debug, bbox, limit, osm_tag, lon, zoom, lang, lat, layer]"
                 * - Search API @see https://photon.komoot.io @see https://github.com/komoot/photon?tab=readme-ov-file#search-api
                 * - leaflet-control-geocoder PhotonOptions @see https://www.liedman.net/leaflet-control-geocoder/docs/interfaces/geocoders.PhotonOptions.html
                 */

                /*
                Photon will use 'accept-language' HTTP header which browsers set by default.
                $language = substr(get_locale(), 0, 2);
                $this->addGeocodingQueryParams($options, 'lang', $language);
                $this->addReverseQueryParams($options, 'lang', $language);
                */

                $options = apply_filters('acf_osm_photon_options', $options);
                break;

            case self::GEOCODER_OPENCAGE:
                /**
                 *  OpenCage options.
                 * 
                 * - OpenCage API @see https://opencagedata.com/api
                 * - leaflet-control-geocoder OpenCageOptions https://www.liedman.net/leaflet-control-geocoder/docs/interfaces/geocoders.OpenCageOptions.html
                 */
                $language = get_locale();
                $this->addGeocodingQueryParams($options, 'language', $language);
                $this->addReverseQueryParams($options, 'language', $language);
                $options = apply_filters('acf_osm_opencage_options', $options);
                break;
        }

        return $options;
    }

    /**
     * GeocoderOptions @see https://github.com/perliedman/leaflet-control-geocoder/blob/master/src/geocoders/api.ts
     */
    protected function addGeocodingQueryParams(&$options, $key, $value)
    {
        if (! isset($options['geocodingQueryParams']))
            $options['geocodingQueryParams'] = [];
        $options['geocodingQueryParams'][$key] = $value;
    }

    /**
     * GeocoderOptions @see https://github.com/perliedman/leaflet-control-geocoder/blob/master/src/geocoders/api.ts
     */
    protected function addReverseQueryParams(&$options, $key, $value)
    {
        if (! isset($options['reverseQueryParams']))
            $options['reverseQueryParams'] = [];
        $options['reverseQueryParams'][$key] = $value;
    }
}

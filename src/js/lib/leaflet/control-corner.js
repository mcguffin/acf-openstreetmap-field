import { L } from 'maps';

/**
 *
 */

// Create additional Control placeholders
/**
 *  @param Object map Leaflet map instance
 *  @param String placement can be top, left, right, bottom
 */
const addOutsideControlCorner = ( map, placement ) => {
    const corners = map._controlCorners;
    const mapContainer = map.getContainer()

    const key = `outside${placement}`;

    // corner exists
    if ( !! corners[key] ) {
        return
    }
    corners[key] = L.DomUtil.create(
        'div', 
        `leaflet-outside leaflet-${placement}`
    );
    mapContainer.before( corners[key] )

    return corners[key]
}

module.exports = {
	addOutsideControlCorner
}

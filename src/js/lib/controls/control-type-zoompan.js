import { ControlType, registerControlType } from 'controls/control-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'
import { L } from 'maps';


class ControlTypeZoompan extends ControlType {
	
	get value() {
		const latlng = this.map.getCenter();
		// should return lng, lat, zoom
		return {
			zoom: this.map.getZoom(),
			lat: latlng.lat,
			lng: latlng.lng,
		}
	}

	mutateMap( mapData ) {
		return Object.assign( mapData, this.value )
	}

	onChange() {
		
	}

	setupControl() {
		this.onChange = () => {
			this.cb(this)
		}
		
		// update on map view change
		this.map.on( 'zoomend', this.onChange );
		this.map.on( 'moveend', this.onChange );

	}
	
	resetControl() {
		this.map.off( 'zoomend', this.onChange );
		this.map.off( 'moveend', this.onChange );
		
	}
}


registerControlType( 'zoompan', ControlTypeZoompan )
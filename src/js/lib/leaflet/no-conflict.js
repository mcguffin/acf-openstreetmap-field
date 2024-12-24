import L from 'leaflet';
import 'leaflet-control-geocoder';
import { locate } from 'leaflet.locatecontrol/src/L.Control.Locate.js';
L.control.locate = locate;

L.noConflict();

export { L }

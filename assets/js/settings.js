!function(){(function(o){(function(){"use strict";var e="undefined"!=typeof window?window.acf_osm:void 0!==o?o.acf_osm:null,n=("undefined"!=typeof window?window.acf_osm_admin:void 0!==o&&o.acf_osm_admin,!1),t=!1;document.addEventListener("acf-osm-map-init",(function(o){var i=o.detail.map;i.on("layeradd",(function(o){var e,n,t=o.layer;if(i.hasLayer(t)){if(t.options.bounds){var a=L.latLngBounds(t.options.bounds);i.fitBounds(a,{paddingTopLeft:[0,0],paddingBottomRight:[0,0]})}(e=i.getZoom())!==(n=Math.max(t.options.minZoom,Math.min(e,t.options.maxZoom)))&&i.setZoom(n)}})),document.addEventListener("click",(function(o){o.target.matches(".action-test[data-layer]")&&(o.preventDefault(),function(o){var a,d;if(d=e.options.layer_config[o.split(".")[0]]||{options:{}},(a=L.tileLayer.provider(o,d.options)).provider_key=o,function(o){var n=o.split("."),t=e.providers[n.shift()];return!!t.isOverlay||(n.length&&(t=t.variants[n.shift()]),!!t.isOverlay)}(o)){if(t&&(t.remove(),t.provider_key===o))return void(t=!1);(t=a).addTo(i)}else n&&(i.eachLayer((function(o){o.remove()})),t=!1),(n=a).addTo(i),t&&(t.remove(),t.addTo(i))}(o.target.getAttribute("data-layer")))}))}))}).call(this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})}();
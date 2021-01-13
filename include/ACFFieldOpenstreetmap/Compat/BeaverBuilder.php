<?php

namespace ACFFieldOpenstreetmap\Compat;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}


use ACFFieldOpenstreetmap\Core;

class BeaverBuilder extends Core\Singleton {
	
	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		add_action('template_redirect',function(){
			if ( \FLBuilderModel::is_builder_active() ) {
				Core\Core::instance()->enqueue_admin();
			}
		});
	}

}
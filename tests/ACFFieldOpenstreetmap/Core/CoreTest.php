<?php

use PHPUnit\Framework\TestCase;
use ACFFieldOpenstreetmap\Compat;
use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Settings;

class CoreTest extends WP_UnitTestCase {
	/**
	 * @covers ACFFieldOpenstreetmap\Core\Core::__construct
	 */
	public function test_instances() {
		$i1 = Core\Core::instance();
		$this->assertInstanceOf(Core\Core::class,$i1);

		$i2 = Compat\ACF::instance();
		$this->assertInstanceOf(Compat\ACF::class,$i2);

		$i3 = Core\LeafletGeocoders::instance();
		$this->assertInstanceOf(Core\LeafletGeocoders::class,$i3);

		$i4 = Core\LeafletProviders::instance();
		$this->assertInstanceOf(Core\LeafletProviders::class,$i4);

		$i5 = Core\MapProxy::instance();
		$this->assertInstanceOf(Core\MapProxy::class,$i5);

		$i6 = Core\OSMProviders::instance();
		$this->assertInstanceOf(Core\OSMProviders::class,$i6);

		$i7 = Core\Templates::instance();
		$this->assertInstanceOf(Core\Templates::class,$i7);

		$i8 = Settings\SettingsOpenStreetMap::instance();
		$this->assertInstanceOf(Settings\SettingsOpenStreetMap::class,$i8);

	}

}

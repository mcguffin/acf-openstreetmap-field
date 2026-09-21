<?php

use PHPUnit\Framework\TestCase;
use ACFFieldOpenstreetmap\Helper;

class ArrayHelperTest extends WP_UnitTestCase {
	/**
	 * Install Proxy dir
	 * @covers ACFFieldOpenstreetmap\Helper\ArrayHelper::filter_recursive
	 */
	public function test_filter_recursive() {
		$test_arr = [
			0 => false,
			1 => 1,
			10 => (object) [],
			'deep' => [
				0 => false,
				1 => true,
				10 => true,
				11 => '0',
				'deeper' => [
					0 => false,
					1 => true,
					10 => true,
				],
				'empty' => [],
			],
		];
		$expected_result = [
			1 => 1,
			10 => (object) [],
			'deep' => [
				1 => true,
				10 => true,
				'deeper' => [
					1 => true,
					10 => true,
				],
			],
		];
		$actual_result = Helper\ArrayHelper::filter_recursive($test_arr);
		$this->assertEquals( $actual_result, $expected_result );

	}
}

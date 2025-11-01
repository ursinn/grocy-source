<?php

declare(strict_types=1);

$rootDir = dirname(__DIR__);
$specPath = $rootDir . '/grocy.openapi.json';

require $rootDir . '/packages/autoload.php';

if (!defined('GROCY_DATAPATH'))
{
	$datapath = getenv('GROCY_DATAPATH');
	if ($datapath === false || $datapath === '')
	{
		$datapath = 'data';
	}

	if ($datapath[0] !== '/' && $datapath[0] !== '\\')
	{
		$datapath = $rootDir . '/' . $datapath;
	}

	define('GROCY_DATAPATH', $datapath);
}

\Slim\Factory\AppFactory::setContainer(new \DI\Container());
$app = \Slim\Factory\AppFactory::create();

require $rootDir . '/routes.php';

$routes = $app->getRouteCollector()->getRoutes();

if (!file_exists($specPath))
{
	throw new RuntimeException('OpenAPI specification not found at ' . $specPath);
}

$spec = json_decode(file_get_contents($specPath), true, 512, JSON_THROW_ON_ERROR);

if (!isset($spec['paths']) || !is_array($spec['paths']))
{
	$spec['paths'] = [];
}

$desiredOperations = [];
$addedOperations = [];
$skippedPatterns = [
	'/api',
	'/api/openapi/specification'
];

foreach ($routes as $route)
{
	$pattern = $route->getPattern();

	if (!str_starts_with($pattern, '/api'))
	{
		continue;
	}

	if (in_array($pattern, $skippedPatterns, true))
	{
		continue;
	}

	$relativePath = substr($pattern, 4);
	if ($relativePath === '')
	{
		continue;
	}

	if ($relativePath[0] !== '/')
	{
		$relativePath = '/' . $relativePath;
	}

	foreach ($route->getMethods() as $method)
	{
		if ($method === 'OPTIONS' || $method === 'HEAD')
		{
			continue;
		}

		$methodLower = strtolower($method);

		$desiredOperations[$relativePath][$methodLower] = true;

		if (isset($spec['paths'][$relativePath][$methodLower]))
		{
			continue;
		}

		if (!isset($spec['paths'][$relativePath]))
		{
			$spec['paths'][$relativePath] = [];
		}

		$spec['paths'][$relativePath][$methodLower] = [
			'tags' => [generateTagFromPath($relativePath)],
			'summary' => 'Auto-generated documentation placeholder',
			'responses' => [
				'200' => [
					'description' => 'Successful response'
				]
			]
		];

		$addedOperations[] = strtoupper($methodLower) . ' ' . $relativePath;
	}
}

foreach ($spec['paths'] as $path => &$operations)
{
	if (!is_array($operations))
	{
		continue;
	}

	foreach (array_keys($operations) as $method)
	{
		if (!isset($desiredOperations[$path][$method]))
		{
			unset($operations[$method]);
		}
	}

	if (empty($operations))
	{
		unset($spec['paths'][$path]);
		continue;
	}
}
unset($operations);

$encoded = json_encode($spec, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
$encoded = preg_replace_callback('/^( +)/m', static function (array $matches): string
{
	$indentLevel = intdiv(strlen($matches[0]), 4);
	return str_repeat("\t", $indentLevel);
}, $encoded);
$encoded = preg_replace_callback('/\[\n(\s+)"([^"\n]+)"\n\1\]/', static function (array $matches): string
{
	return '["' . $matches[2] . '"]';
}, $encoded);
file_put_contents($specPath, $encoded);

if (!empty($addedOperations))
{
	echo "Added OpenAPI placeholders for:\n";
	foreach ($addedOperations as $operation)
	{
		echo "  - $operation\n";
	}
}

function generateTagFromPath(string $path): string
{
	$segments = explode('/', trim($path, '/'));
	$first = $segments[0] ?? '';

	if ($first === '')
	{
		return 'General';
	}

	$first = str_replace(['-', '_'], ' ', $first);
	return ucwords($first);
}

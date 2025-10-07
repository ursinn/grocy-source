<?php

namespace Grocy\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class LiveActivityApiController extends BaseApiController
{
	public function LiveActivityStream(Request $request, Response $response, array $args)
	{
		// Use the event manager to start the SSE stream
		\Grocy\Helpers\LiveEventManager::startSSEStream();
		exit;
	}

}
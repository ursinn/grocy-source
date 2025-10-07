<?php

namespace Grocy\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class LiveScreenController extends BaseController
{
	public function LiveScreen(Request $request, Response $response, array $args)
	{
		return $this->renderPage($response, 'livescreen', [
			'title' => $this->getLocalizationService()->__t('Live Screen')
		]);
	}
}
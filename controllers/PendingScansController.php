<?php

namespace Grocy\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PendingScansController extends BaseController
{
	public function PendingScansList(Request $request, Response $response, array $args)
	{
		return $this->renderPage($response, 'pendingscans', [
			'pendingScans' => $this->getPendingScansService()->GetPendingScans(),
			'pendingScansCount' => $this->getPendingScansService()->GetPendingScansCount()
		]);
	}

	public function PendingScanView(Request $request, Response $response, array $args)
	{
		$id = intval($args['id']);
		$pendingScan = $this->getPendingScansService()->GetPendingScan($id);

		if (!$pendingScan)
		{
			return $response->withStatus(404);
		}

		// Decode the request_data JSON for display
		$requestData = null;
		if (!empty($pendingScan->request_data))
		{
			$requestData = json_decode($pendingScan->request_data, true);
		}

		return $this->renderPage($response, 'pendingscan', [
			'pendingScan' => $pendingScan,
			'requestData' => $requestData
		]);
	}
}
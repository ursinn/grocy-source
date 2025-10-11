<?php

namespace Grocy\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PendingScansApiController extends BaseApiController
{
	public function GetPendingScans(Request $request, Response $response, array $args)
	{
		$includeResolved = $request->getQueryParam('include_resolved', 'false') === 'true';
		$pendingScans = $this->getPendingScansService()->GetPendingScans($includeResolved);

		return $this->ApiResponse($response, $pendingScans);
	}

	public function GetPendingScan(Request $request, Response $response, array $args)
	{
		$id = intval($args['id']);
		$pendingScan = $this->getPendingScansService()->GetPendingScan($id);

		if (!$pendingScan)
		{
			return $this->GenericErrorResponse($response, 'Pending scan not found', 404);
		}

		// Decode the request_data JSON for easier consumption
		if (!empty($pendingScan->request_data))
		{
			$pendingScan->request_data = json_decode($pendingScan->request_data, true);
		}

		return $this->ApiResponse($response, $pendingScan);
	}

	public function ResolvePendingScan(Request $request, Response $response, array $args)
	{
		$id = intval($args['id']);
		$userId = $this->getUserId();

		try
		{
			$this->getPendingScansService()->ResolvePendingScan($id, $userId);
			return $this->ApiResponse($response, ['success' => true]);
		}
		catch (\Exception $ex)
		{
			return $this->GenericErrorResponse($response, $ex->getMessage());
		}
	}

	public function DeletePendingScan(Request $request, Response $response, array $args)
	{
		$id = intval($args['id']);

		try
		{
			$this->getPendingScansService()->DeletePendingScan($id);
			return $this->ApiResponse($response, ['success' => true]);
		}
		catch (\Exception $ex)
		{
			return $this->GenericErrorResponse($response, $ex->getMessage());
		}
	}

	public function GetPendingScansByBarcode(Request $request, Response $response, array $args)
	{
		$barcode = $args['barcode'];
		$pendingScans = $this->getPendingScansService()->GetPendingScansByBarcode($barcode);

		return $this->ApiResponse($response, $pendingScans);
	}

	public function GetPendingScansCount(Request $request, Response $response, array $args)
	{
		$count = $this->getPendingScansService()->GetPendingScansCount();

		return $this->ApiResponse($response, ['count' => $count]);
	}

	private function getUserId()
	{
		// Try to get user ID from session or authentication context
		// This matches the pattern used in other controllers
		if (isset($_SESSION['grocy_user']) && !empty($_SESSION['grocy_user']['id']))
		{
			return $_SESSION['grocy_user']['id'];
		}

		return null;
	}

	private function getClientIpAddress($request)
	{
		// Check for IP address from proxy headers first
		$ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];

		foreach ($ipKeys as $key)
		{
			if (array_key_exists($key, $_SERVER) === true)
			{
				foreach (explode(',', $_SERVER[$key]) as $ip)
				{
					$ip = trim($ip);
					if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false)
					{
						return $ip;
					}
				}
			}
		}

		// Fallback to standard REMOTE_ADDR
		return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
	}
}
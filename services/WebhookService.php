<?php

namespace Grocy\Services;

class WebhookService extends BaseService
{
	private $webhooks = [];

	public function __construct()
	{
		$this->loadWebhooks();
	}

	private function loadWebhooks()
	{
		if (defined('GROCY_WEBHOOKS_CONFIG') && !empty(GROCY_WEBHOOKS_CONFIG))
		{
			$webhooks = json_decode(GROCY_WEBHOOKS_CONFIG, true);
			if (json_last_error() === JSON_ERROR_NONE && is_array($webhooks))
			{
				$this->webhooks = $webhooks;
			}
		}
	}

	public function triggerWebhooks($eventType, $eventData)
	{
		if (empty($this->webhooks))
		{
			return;
		}

		foreach ($this->webhooks as $webhook)
		{
			if (!isset($webhook['enabled']) || !$webhook['enabled'])
			{
				continue;
			}

			if (isset($webhook['events']) && !in_array($eventType, $webhook['events']))
			{
				continue;
			}

			$this->sendWebhook($webhook, $eventType, $eventData);
		}
	}

	private function sendWebhook($webhook, $eventType, $eventData)
	{
		if (!isset($webhook['url']) || empty($webhook['url']))
		{
			return;
		}

		$method = isset($webhook['method']) ? strtoupper($webhook['method']) : 'POST';
		$headers = isset($webhook['headers']) ? $webhook['headers'] : [];

		$payload = [
			'event_type' => $eventType,
			'data' => $eventData,
			'timestamp' => microtime(true),
			'source' => 'grocy'
		];

		try
		{
			$this->makeHttpRequest($webhook['url'], $method, $payload, $headers);
		}
		catch (\Exception $e)
		{
			error_log('Webhook delivery failed: ' . $e->getMessage());
		}
	}

	private function makeHttpRequest($url, $method, $payload, $headers)
	{
		$contextHeaders = ['User-Agent: Grocy-Webhook/1.0'];

		foreach ($headers as $key => $value)
		{
			$contextHeaders[] = $key . ': ' . $value;
		}

		$context = [
			'method' => $method,
			'header' => implode("\r\n", $contextHeaders),
			'timeout' => 30,
			'ignore_errors' => true
		];

		if ($method === 'GET')
		{
			$url .= '?' . http_build_query(['data' => json_encode($payload)]);
		}
		else
		{
			$contextHeaders[] = 'Content-Type: application/json';
			$context['content'] = json_encode($payload);
			$context['header'] = implode("\r\n", $contextHeaders);
		}

		$streamContext = stream_context_create(['http' => $context]);
		$response = file_get_contents($url, false, $streamContext);

		if ($response === false)
		{
			throw new \Exception('Failed to send webhook request');
		}

		if (isset($http_response_header))
		{
			$statusLine = $http_response_header[0];
			if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $statusLine, $matches))
			{
				$statusCode = intval($matches[1]);
				if ($statusCode >= 400)
				{
					throw new \Exception('Webhook returned status code: ' . $statusCode);
				}
			}
		}
	}
}
<?php

namespace Grocy\Helpers;

class LiveEventManager
{
	private static $eventFile = null;
	private static function getEventFile()
	{
		if (self::$eventFile === null) {
			self::$eventFile = GROCY_DATAPATH . DIRECTORY_SEPARATOR . 'live_events.jsonl';
		}
		return self::$eventFile;
	}

	public static function publishEvent($type, $data)
	{
		$event = [
			'id' => uniqid(mt_rand(), true),
			'type' => $type,
			'data' => $data,
			'timestamp' => microtime(true)
		];

		// Trigger webhooks
		try {
			$webhookService = \Grocy\Services\WebhookService::getInstance();
			$webhookService->triggerWebhooks($type, $data);
		} catch (\Exception $e) {
			error_log('Webhook trigger failed: ' . $e->getMessage());
		}

		$eventLine = json_encode($event) . "\n";
		$eventFile = self::getEventFile();

		// Ensure the file exists
		if (!file_exists($eventFile)) {
			touch($eventFile);
		}

		// Append event to file (this will trigger inotify for all listening SSE connections)
		file_put_contents($eventFile, $eventLine, FILE_APPEND | LOCK_EX);
	}

	public static function startSSEStream()
	{
		if (!function_exists('inotify_init')) {
			throw new \Exception('inotify extension is required for live events');
		}

		// Set execution time limit for SSE connections (10 minutes max)
		set_time_limit(600);

		// Disable output buffering and set headers
		if (ob_get_level()) {
			ob_end_clean();
		}

		header('Content-Type: text/event-stream');
		header('Cache-Control: no-cache');
		header('Connection: keep-alive');
		header('X-Accel-Buffering: no'); // Disable nginx buffering

		$eventFile = self::getEventFile();

		// Ensure event file exists
		if (!file_exists($eventFile)) {
			touch($eventFile);
		}

		// Send initial connection event
		echo "event: connected\n";
		echo "data: " . json_encode(['message' => 'Connected to live stream']) . "\n\n";
		flush();

		// Send last 20 events on connection (including undone items)
		$lastEvents = self::getLastNLines($eventFile, 100); // Get more events to ensure we have enough after filtering
		$validEvents = [];

		foreach ($lastEvents as $eventLine) {
			$event = json_decode(trim($eventLine), true);
			if ($event && isset($event['type']) && ($event['type'] === 'stock_activity' || $event['type'] === 'stock_undo' || $event['type'] === 'pending_scan')) {
				$validEvents[] = $event;
			}
		}

		// Sort by timestamp to ensure chronological order
		usort($validEvents, function($a, $b) {
			$aTimestamp = $a['timestamp'] ?? 0;
			$bTimestamp = $b['timestamp'] ?? 0;
			return $aTimestamp <=> $bTimestamp;
		});

		$eventsToSend = array_slice($validEvents, -40);
		foreach ($eventsToSend as $event) {
			echo "data: " . json_encode($event) . "\n\n";
			flush();
		}

		// Initialize inotify
		$inotify = inotify_init();
		if ($inotify === false) {
			throw new \Exception('Failed to initialize inotify');
		}

		$watch = inotify_add_watch($inotify, $eventFile, IN_MODIFY);
		if ($watch === false) {
			fclose($inotify);
			throw new \Exception('Failed to add inotify watch');
		}

		// Keep connection alive and respond to file changes
		while (true) {
			// Check for client disconnect
			if (connection_aborted()) {
				break;
			}

			// Wait for file modification
			$read = [$inotify];
			$write = null;
			$except = null;

			$result = stream_select($read, $write, $except, 30); // 30 second timeout

			if ($result > 0) {
				$events = inotify_read($inotify);
				if ($events !== false) {
					// File was modified, read the last line (newest event)
					$lastLine = self::getLastLine($eventFile);
					if ($lastLine) {
						$event = json_decode(trim($lastLine), true);
						if ($event) {
							echo "data: " . json_encode($event) . "\n\n";
							flush();
						}
					}
				}
			} else {
				// Send heartbeat to keep connection alive
				echo "event: heartbeat\n";
				echo "data: " . json_encode(['timestamp' => time()]) . "\n\n";
				flush();
			}
		}

		// Cleanup
		inotify_rm_watch($inotify, $watch);
		fclose($inotify);
	}

	private static function getLastLine($filename)
	{
		$line = '';
		$f = fopen($filename, 'r');
		$cursor = -1;

		fseek($f, $cursor, SEEK_END);
		$char = fgetc($f);

		// Trim trailing newlines
		while ($char === "\n" || $char === "\r") {
			fseek($f, $cursor--, SEEK_END);
			$char = fgetc($f);
		}

		// Read until the start of the line
		while ($char !== false && $char !== "\n" && $char !== "\r") {
			$line = $char . $line;
			fseek($f, $cursor--, SEEK_END);
			$char = fgetc($f);
		}

		fclose($f);
		return $line;
	}

	private static function getLastNLines($filename, $n)
	{
		if (!file_exists($filename) || filesize($filename) == 0) {
			return [];
		}

		$lines = [];
		$f = fopen($filename, 'r');
		$cursor = -1;

		fseek($f, $cursor, SEEK_END);
		$char = fgetc($f);

		// Trim trailing newlines
		while ($char === "\n" || $char === "\r") {
			fseek($f, $cursor--, SEEK_END);
			$char = fgetc($f);
		}

		$line = '';
		$lineCount = 0;

		// Read backwards until we have n lines
		while ($char !== false && $lineCount < $n) {
			if ($char === "\n" || $char === "\r") {
				if ($line !== '') {
					array_unshift($lines, $line);
					$line = '';
					$lineCount++;
				}
			} else {
				$line = $char . $line;
			}

			fseek($f, $cursor--, SEEK_END);
			$char = fgetc($f);
		}

		// Add the last line if we haven't reached n lines yet
		if ($line !== '' && $lineCount < $n) {
			array_unshift($lines, $line);
		}

		fclose($f);
		return $lines;
	}


}

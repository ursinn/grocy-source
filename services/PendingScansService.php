<?php

namespace Grocy\Services;

class PendingScansService extends BaseService
{
	public function LogFailedScan(string $barcode, string $operation, array $requestData, string $errorMessage, ?string $userAgent = null, ?string $ipAddress = null)
	{
		$row = $this->getDatabase()->pending_scans()->createRow([
			'barcode' => $barcode,
			'operation' => $operation,
			'request_data' => json_encode($requestData),
			'error_message' => $errorMessage,
			'user_agent' => $userAgent,
			'ip_address' => $ipAddress,
			'resolved' => 0
		]);

		$row->save();

		// Publish live event for pending scan
		try {
			$currentTimestamp = (new \DateTime('now', new \DateTimeZone(getenv('TZ') ?: 'UTC')))->setTimezone(new \DateTimeZone('UTC'))->format('c');

			\Grocy\Helpers\LiveEventManager::publishEvent('pending_scan', [
				'id' => $row->id,
				'barcode' => $barcode,
				'operation' => $operation,
				'error_message' => $errorMessage,
				'timestamp' => $currentTimestamp,
				'user_agent' => $userAgent,
				'ip_address' => $ipAddress
			]);
		} catch (\Exception $ex) {
			// Don't let live event publishing failure break the main functionality
			error_log('Failed to publish pending scan live event: ' . $ex->getMessage());
		}

		return $row->id;
	}

	public function GetPendingScans(bool $includeResolved = true)
	{
		$query = $this->getDatabase()->pending_scans();

		if (!$includeResolved)
		{
			$query = $query->where('resolved', 0);
		}

		return $query->orderBy('resolved', 'ASC')->orderBy('row_created_timestamp', 'DESC')->fetchAll();
	}

	public function GetPendingScan(int $id)
	{
		return $this->getDatabase()->pending_scans()->where('id', $id)->fetch();
	}

	public function ResolvePendingScan(int $id, ?int $userId = null)
	{
		$row = $this->getDatabase()->pending_scans()->where('id', $id)->fetch();
		if (!$row)
		{
			throw new \Exception('Pending scan not found');
		}

		$row->update([
			'resolved' => 1,
			'resolved_timestamp' => date('Y-m-d H:i:s'),
			'resolved_by' => $userId
		]);

		return true;
	}

	public function DeletePendingScan(int $id)
	{
		$row = $this->getDatabase()->pending_scans()->where('id', $id)->fetch();
		if (!$row)
		{
			throw new \Exception('Pending scan not found');
		}

		return $row->delete();
	}

	public function GetPendingScansByBarcode(string $barcode)
	{
		return $this->getDatabase()->pending_scans()
			->where('barcode', $barcode)
			->orderBy('row_created_timestamp', 'DESC')
			->fetchAll();
	}

	public function GetPendingScansByOperation(string $operation)
	{
		return $this->getDatabase()->pending_scans()
			->where('operation', $operation)
			->where('resolved', 0)
			->orderBy('row_created_timestamp', 'DESC')
			->fetchAll();
	}

	public function GetPendingScansCount()
	{
		return $this->getDatabase()->pending_scans()
			->where('resolved', 0)
			->count();
	}
}
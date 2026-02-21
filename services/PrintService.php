<?php

namespace Grocy\Services;

use DateTime;
use Mike42\Escpos\PrintConnectors\NetworkPrintConnector;
use Mike42\Escpos\PrintConnectors\FilePrintConnector;
use Mike42\Escpos\Printer;

class PrintService extends BaseService
{
	public function printProductLabel(array $args)
	{
		$printer = self::getPrinterHandle();
		if ($printer === false)
		{
			throw new \Exception('Unable to connect to printer');
		}

		$printer->setJustification(Printer::JUSTIFY_CENTER);
		$printer->qrCode($args['grocycode'], Printer::QR_ECLEVEL_L, 4);
		$printer->feed();
		$printer->text($args['product']);
        if (isset($args['due_date'])) {
            $printer->feed();
            $printer->text($args['due_date']);
        }
		$printer->feed(2);
		$printer->cut();
		$printer->close();
	}

	public function printShoppingList(bool $printHeader, array $lines): array
	{
		$printer = self::getPrinterHandle();
		if ($printer === false)
		{
			throw new \Exception('Unable to connect to printer');
		}

		if ($printHeader)
		{
			self::printHeader($printer);
		}

		foreach ($lines as $line)
		{
			$printer->text($line);
			$printer->feed();
		}

		$printer->feed(3);
		$printer->cut();
		$printer->close();
		return [
			'result' => 'OK'
		];
	}

	private static function getPrinterHandle()
	{
		if (GROCY_TPRINTER_IS_NETWORK_PRINTER)
		{
			$connector = new NetworkPrintConnector(GROCY_TPRINTER_IP, GROCY_TPRINTER_PORT);
		}
		else
		{
			$connector = new FilePrintConnector(GROCY_TPRINTER_CONNECTOR);
		}
		return new Printer($connector);
	}

	private static function printHeader(Printer $printer)
	{
		$date = new DateTime();
		$dateFormatted = $date->format('d/m/Y H:i');

		$printer->setJustification(Printer::JUSTIFY_CENTER);
		$printer->selectPrintMode(Printer::MODE_DOUBLE_WIDTH);
		$printer->setTextSize(4, 4);
		$printer->setReverseColors(false);
		$printer->text('Grocy');
		$printer->setTextSize(1, 1);
		$printer->feed(4);
		$printer->text($dateFormatted);
		$printer->selectPrintMode();
		$printer->feed(2);
	}
}

var CurrentStockEntry = null;
var CurrentContainerWeight = 0;
var ExpectedGrossWeight = 0; // Store the expected weight to avoid floating point precision issues
var WEIGHT_PRECISION_TOLERANCE = Grocy.WeightPrecisionTolerance; // Global tolerance for weight comparisons from PHP

// Helper functions for consistent formatting
function formatAmount(amount) {
	return amount.toLocaleString({ minimumFractionDigits: 0, maximumFractionDigits: Grocy.UserSettings.stock_decimal_places_amounts });
}

function formatAmountWithUnit(amount) {
	if (!CurrentStockEntry?.product_details) return formatAmount(amount);
	var unitText = __n(amount, CurrentStockEntry.product_details.quantity_unit_stock.name, CurrentStockEntry.product_details.quantity_unit_stock.name_plural, true);
	return formatAmount(amount) + ' ' + unitText;
}

function setFieldValidation(fieldId, isValid, message) {
	var field = $('#' + fieldId);
	var formGroup = field.closest('.form-group');
	var invalidFeedback = formGroup.find('.invalid-feedback');

	// Remove existing validation classes
	field.removeClass('is-invalid is-valid');
	invalidFeedback.text('').removeClass('d-block');

	if (isValid) {
		field.addClass('is-valid');
	} else {
		field.addClass('is-invalid');
		invalidFeedback.text(message).addClass('d-block');
	}
}

function isWeightChangeSignificant(currentWeight, expectedWeight) {
	return Math.abs(currentWeight - expectedWeight) >= WEIGHT_PRECISION_TOLERANCE;
}

function checkWeightInconsistencyWarning(currentAmount, increaseAmount) {
	// Don't show warning for very small current amounts (avoid division by zero and extreme percentages)
	if (currentAmount <= WEIGHT_PRECISION_TOLERANCE) {
		return '';
	}

	var percentageIncrease = (increaseAmount / currentAmount) * 100;

	// Show warning if increase is more than 3% of current amount (weight inconsistency)
	if (percentageIncrease > 2) {
		var warningClass = percentageIncrease > 5 ? 'text-danger' : 'text-warning';
		var warningIcon = percentageIncrease > 5 ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';

		return '<br><div class="alert ' + (percentageIncrease > 10 ? 'alert-danger' : 'alert-warning') + ' mt-2 mb-0">' +
			'<i class="fa-solid ' + warningIcon + '"></i> ' +
			'<strong>' + __t('Weight Inconsistency Warning') + ':</strong> ' +
			__t('Adding %1$s (%2$s%% increase from current amount). Please verify this measurement is correct.',
				formatAmountWithUnit(increaseAmount),
				Math.round(percentageIncrease * 10) / 10) +
			'</div>';
	}

	return '';
}

function createScenarioAlert(type, iconClass, message) {
	var alertClass = type === 'increase' ? 'alert-success' : 'alert-info';
	return '<div id="inventory-scenario" class="alert ' + alertClass + ' mt-2">' +
		'<i class="fa-solid ' + iconClass + '"></i> ' + message + '</div>';
}

function resetInventoryState() {
	CurrentStockEntry = null;
	CurrentContainerWeight = 0;
	ExpectedGrossWeight = 0;
}


$('#container-inventory-form').on('submit', function(e)
{
	e.preventDefault();

	// Validate gross weight first
	validateGrossWeight();

	// Validate stock source/destination if required
	validateStockSourceDestination();

	if (!Grocy.FrontendHelpers.ValidateForm("container-inventory-form", true))
	{
		return;
	}

	// Additional check: prevent submission if gross weight is invalid
	if ($('#gross_weight').hasClass('is-invalid'))
	{
		return;
	}

	// Additional check: prevent submission if stock source/destination validation failed
	if ($('#source_stock_entry').hasClass('is-invalid') || $('#destination_stock_entry').hasClass('is-invalid'))
	{
		return;
	}

	var jsonForm = $('#container-inventory-form').serializeJSON();
	Grocy.FrontendHelpers.BeginUiBusy("container-inventory-form");

	$.ajax({
		url: U('/inventory-container'),
		method: 'POST',
		data: JSON.stringify(jsonForm),
		contentType: 'application/json',
		dataType: 'json'
	})
	.done(function(response)
	{
		Grocy.FrontendHelpers.EndUiBusy("container-inventory-form");

		if (response.success)
		{
			toastr.success(__t('Inventory saved successfully') +
				'<br><strong>' + __t('Net weight') + ':</strong> ' +
				formatAmountWithUnit(response.net_weight));

			// Refresh product card to reflect updated inventory
			if (CurrentStockEntry && CurrentStockEntry.product)
			{
				Grocy.Components.ProductCard.Refresh(CurrentStockEntry.product.id);
			}

			// Refresh recent inventories table
			loadRecentInventories();

			// Clear the form
			clearForm();

			// Focus back to barcode input
			setTimeout(function()
			{
				$('#container_scanner').focus();
			}, Grocy.FormFocusDelay);
		}
		else
		{
			toastr.error(response.error);
		}
	})
	.fail(function(xhr)
	{
		Grocy.FrontendHelpers.EndUiBusy("container-inventory-form");

		var errorMsg = __t('An error occurred');
		if (xhr.responseJSON && xhr.responseJSON.error)
		{
			errorMsg = xhr.responseJSON.error;
		}

		toastr.error(errorMsg);
	});
});


$('#container_scanner').on('blur', function()
{
	var barcode = $(this).val().trim();
	if (barcode.length > 0)
	{
		processBarcode(barcode);
	}
});

$('#container_scanner').on('keydown', function(e)
{
	if (e.keyCode === 13) // Enter key
	{
		e.preventDefault();
		var barcode = $(this).val().trim();
		if (barcode.length > 0)
		{
			processBarcode(barcode);
		}
	}
});

$('#gross_weight').on('input blur change', function()
{
	validateGrossWeight();
	calculateNetWeight();
});

function validateGrossWeight()
{
	var grossWeight = parseFloat($('#gross_weight').val()) || 0;

	if (grossWeight < CurrentContainerWeight)
	{
		setFieldValidation('gross_weight', false, __t('Gross weight cannot be less than container weight (%1$s)', formatAmountWithUnit(CurrentContainerWeight)));
		return false;
	}

	if (!isWeightChangeSignificant(grossWeight, ExpectedGrossWeight) && CurrentStockEntry)
	{
		setFieldValidation('gross_weight', false, __t('No inventory change detected - adjust the gross weight to reflect actual inventory'));
		return false;
	}

	if (grossWeight >= CurrentContainerWeight)
	{
		setFieldValidation('gross_weight', true, '');
		return true;
	}

	return false;
}

function validateStockSourceDestination()
{
	clearValidationStates();

	if (!CurrentStockEntry) {
		return true;
	}

	return validateStockSource() && validateStockDestination();
}

function clearValidationStates()
{
	setFieldValidation('source_stock_entry', true, '');
	setFieldValidation('destination_stock_entry', true, '');
}

function validateStockSource()
{
	if ($('#stock-source-group').hasClass('d-none')) {
		return true;
	}

	var sourceStockEntry = $('#source_stock_entry').val();
	var partialTransferMode = $('input[name="partial_transfer_mode"]:checked').val();

	if (!sourceStockEntry && !partialTransferMode) {
		setFieldValidation('source_stock_entry', false, __t('Please select where this stock came from or choose how to handle the stock increase'));
		return false;
	}

	return true;
}

function validateStockDestination()
{
	if ($('#stock-destination-group').hasClass('d-none')) {
		return true;
	}

	var destinationType = $('input[name="destination_type"]:checked').val();
	if (destinationType !== 'transfer') {
		return true;
	}

	var destinationStockEntry = $('#destination_stock_entry').val();
	if (!destinationStockEntry) {
		setFieldValidation('destination_stock_entry', false, __t('Please select destination stock entry'));
		return false;
	}

	return true;
}

$('#clear-form').on('click', function()
{
	clearForm();
});

$('input[name="destination_type"]').on('change', function()
{
	if ($(this).val() === 'transfer')
	{
		$('#destination-stock-entry').removeClass('d-none');
		loadAvailableStockEntries('destination');
	}
	else
	{
		$('#destination-stock-entry').addClass('d-none');
		// Clear validation when hiding destination entry
		setFieldValidation('destination_stock_entry', true, '');
	}
});

// Add validation triggers for stock source/destination selections
$('#source_stock_entry').on('change', function()
{
	updatePartialTransferInfo();
	validateStockSourceDestination();
});

$('#destination_stock_entry').on('change', function()
{
	validateStockSourceDestination();
});

$('input[name="partial_transfer_mode"]').on('change', function()
{
	// Handle the transfer available only mode by adjusting gross weight
	handlePartialTransferMode();
	// Update the details text when mode changes
	updatePartialTransferInfo();
	validateStockSourceDestination();
});

// Barcode camera button removed - handled by global barcode scanner component

function processBarcode(barcode)
{
	var barcodeData = parseGrocycode(barcode);
	if (!barcodeData) return;

	// Reset form but keep the barcode we just scanned
	clearForm(true);

	// Get stock entry details
	loadStockEntryDetails(barcodeData.productId, barcodeData.stockId);
}

function parseGrocycode(barcode)
{
	// Validate Grocycode format
	if (!barcode.startsWith('grcy:p:'))
	{
		showError(__t('Invalid barcode format. Expected container barcode (grcy:p:PRODUCT_ID:STOCK_ID)'));
		return null;
	}

	var parts = barcode.split(':');
	if (parts.length < 4)
	{
		showError(__t('Invalid barcode format. Missing stock entry information.'));
		return null;
	}

	return {
		productId: parts[2],
		stockId: parts[3]
	};
}

function loadStockEntryDetails(productId, stockId)
{
	Grocy.FrontendHelpers.BeginUiBusy("container-details");

	// Get product details
	Grocy.Api.Get('stock/products/' + productId, function(productDetails)
	{
		// Get stock entries for this product
		Grocy.Api.Get('stock/products/' + productId + '/entries', function(stockEntries)
		{
			// Find the specific stock entry
			var stockEntry = stockEntries.find(function(entry) {
				return entry.stock_id === stockId;
			});

			if (!stockEntry)
			{
				Grocy.FrontendHelpers.EndUiBusy("container-details");
				showError(__t('Stock entry not found'));
				return;
			}

			// Get the location for this specific stock entry
			var locationId = stockEntry.location_id || productDetails.product.location_id;

			// Use cached location data
			loadCachedData(function(products, locations) {
				var location = null;
				if (locationId) {
					location = locations.find(function(loc) {
						return loc.id == locationId;
					});
				}

				// Get container weight from userfield
				getContainerWeight(stockId, function(containerWeight)
				{
					CurrentStockEntry = {
						stock_entry: stockEntry,
						product: productDetails.product,
						product_details: productDetails,
						location: location
					};
					CurrentContainerWeight = containerWeight;

					displayStockEntryDetails();
					Grocy.FrontendHelpers.EndUiBusy("container-details");
				});
			});
		});
	});
}

function getContainerWeight(stockId, callback)
{
	// Get userfield values for this stock entry
	var apiCall = Grocy.Api.Get('userfields/stock/' + stockId, function(userfieldValues)
	{
		// Get the container weight directly from the userfields object
		var containerWeightValue = userfieldValues.StockEntryContainerWeight;

		var weight = containerWeightValue ? parseFloat(containerWeightValue) || 0 : 0;

		if (weight === 0)
		{
			// Show modal about missing container weight
			$('#container-weight-modal').modal('show');
		}

		callback(weight);
	});

	// Check if apiCall is valid before chaining .fail()
	if (apiCall && typeof apiCall.fail === 'function')
	{
		apiCall.fail(function()
		{
			// If userfields API fails, show error
			showError(__t('Failed to load container weight information. Please try again.'));
			Grocy.FrontendHelpers.EndUiBusy("container-details");
		});
	}
}

function displayStockEntryDetails()
{
	if (!CurrentStockEntry)
	{
		return;
	}

	var stockEntry = CurrentStockEntry.stock_entry;
	var product = CurrentStockEntry.product;
	var location = CurrentStockEntry.location;

	// Populate the details card
	$('#product_name').text(product.name);
	$('#current_amount').text(formatAmountWithUnit(parseFloat(stockEntry.amount)));
	$('#location_name').text(location ? location.name : __t('Unknown'));
	$('#container_weight').text(formatAmountWithUnit(CurrentContainerWeight));
	$('#best_before_date').text(moment(stockEntry.best_before_date).format('L'));

	// Set units for weight inputs
	$('#gross_weight_unit').text(CurrentStockEntry.product_details.quantity_unit_stock.name);
	$('#net_weight_unit').text(CurrentStockEntry.product_details.quantity_unit_stock.name);

	// Update product card with current product
	Grocy.Components.ProductCard.Refresh(product.id);

	// Show the container details section
	$('#container-details').removeClass('d-none');

	// Initial field validation will handle button state

	// Set default gross weight to current amount + container weight
	var defaultGrossWeight = parseFloat(stockEntry.amount) + CurrentContainerWeight;
	ExpectedGrossWeight = defaultGrossWeight; // Store the expected weight
	$('#gross_weight').val(formatAmount(defaultGrossWeight));

	// Calculate net weight and update scenario
	calculateNetWeight();

	// Focus on gross weight input
	setTimeout(function()
	{
		$('#gross_weight').focus().select();
	}, Grocy.FormFocusDelay);
}

function calculateNetWeight()
{
	var grossWeight = parseFloat($('#gross_weight').val()) || 0;
	var netWeight = grossWeight - CurrentContainerWeight;

	if (netWeight < 0)
	{
		netWeight = 0;
	}

	$('#net_weight').val(formatAmount(netWeight));

	// Show inventory scenario information
	updateInventoryScenario(netWeight);
}

function updateInventoryScenario(netWeight)
{
	// Remove any existing scenario info
	$('#inventory-scenario').remove();

	// Hide all scenario-specific form fields
	$('#stock-source-group').addClass('d-none');
	$('#stock-destination-group').addClass('d-none');

	// Clear validation when hiding fields
	setFieldValidation('source_stock_entry', true, '');
	setFieldValidation('destination_stock_entry', true, '');

	if (!CurrentStockEntry || netWeight <= 0)
	{
		return;
	}

	var currentAmount = parseFloat(CurrentStockEntry.stock_entry.amount) || 0;
	var difference = netWeight - currentAmount;

	var scenarioHtml = '';

	// Check if this represents a significant inventory change
	var currentGrossWeight = parseFloat($('#gross_weight').val()) || 0;
	var hasSignificantChange = !isNaN(difference) &&
		Math.abs(difference) >= WEIGHT_PRECISION_TOLERANCE &&
		isWeightChangeSignificant(currentGrossWeight, ExpectedGrossWeight);

	if (!hasSignificantChange)
	{
		setFieldValidation('gross_weight', false, __t('No inventory change detected - adjust the gross weight to reflect actual inventory'));
		return;
	}

	setFieldValidation('gross_weight', true, '');

	if (difference > 0) // Stock increased
	{
		scenarioHtml = createScenarioAlert('increase', 'fa-plus-circle',
			__t('Stock increased by %1$s. Please specify where this stock came from.', formatAmountWithUnit(difference)));
		$('#stock-source-group').removeClass('d-none');

		// Show the option to add without source immediately
		updatePartialTransferInfo();

		loadAvailableStockEntries('source');
		// Trigger validation since we now require a source
		setTimeout(function() {
			validateStockSourceDestination();
		}, 100);
	}
	else if (difference < 0) // Stock decreased
	{
		scenarioHtml = createScenarioAlert('decrease', 'fa-minus-circle',
			__t('Stock decreased by %1$s. Please specify where this stock went.', formatAmountWithUnit(Math.abs(difference))));
		$('#stock-destination-group').removeClass('d-none');

		// Always reset to "Consumed" as default
		$('#destination_consume').prop('checked', true);
		$('#destination-stock-entry').addClass('d-none');
		// Clear validation since consume doesn't require destination selection
		setFieldValidation('destination_stock_entry', true, '');
	}

	if (scenarioHtml)
	{
		$('#net_weight').closest('.form-group').after(scenarioHtml);
	}
}

function loadAvailableStockEntries(type)
{
	if (!CurrentStockEntry)
	{
		return;
	}

	var productId = CurrentStockEntry.product.id;

	// Use cached location data
	loadCachedData(function(_, locations) {
		// Create a lookup map for locations
		var locationMap = {};
		locations.forEach(function(location) {
			locationMap[location.id] = location.name;
		});

		// Get all stock entries for this product
		Grocy.Api.Get('stock/products/' + productId + '/entries', function(stockEntries)
		{
			var selectElement = $('#' + type + '_stock_entry');
			selectElement.empty();
			selectElement.append('<option value="">' + __t('Select stock entry') + '</option>');

			// Filter out the current stock entry
			var availableEntries = stockEntries.filter(function(entry) {
				return entry.stock_id !== CurrentStockEntry.stock_entry.stock_id;
			});

			// Store available entries for partial transfer calculations
			window.AvailableStockEntries = availableEntries;

			availableEntries.forEach(function(entry) {
				var amount = formatAmount(parseFloat(entry.amount));
				var unit = CurrentStockEntry.product_details.quantity_unit_stock.name;

				// Create detailed option text similar to consume form
				var optionText = __t("Amount: %1$s %2$s; Due on %3$s; Bought on %4$s",
					amount,
					unit,
					moment(entry.best_before_date).format("YYYY-MM-DD"),
					moment(entry.purchased_date).format("YYYY-MM-DD")
				);

				// Add location info if available
				if (entry.location_id && locationMap[entry.location_id]) {
					optionText += "; " + __t("Location: %1$s", locationMap[entry.location_id]);
				}

				// Add note if available
				if (entry.note && entry.note.trim()) {
					optionText += "; " + __t("Note: %1$s", entry.note);
				}

				selectElement.append('<option value="' + entry.stock_id + '">' + optionText + '</option>');
			});

			// Check if we need to show the partial transfer option
			updatePartialTransferInfo();
		});
	});
}

function updatePartialTransferInfo()
{
	// Reset UI state
	hidePartialTransferUI();

	if (!isPartialTransferContextValid()) {
		return;
	}

	var transferContext = getTransferContext();

	if (!transferContext.hasSourceSelected) {
		showNoSourceOptions(transferContext);
		return;
	}

	if (transferContext.sourceHasEnoughStock) {
		// Source has enough stock, no special handling needed
		return;
	}

	showPartialTransferOptions(transferContext);
}

function isPartialTransferContextValid()
{
	return CurrentStockEntry &&
		   window.AvailableStockEntries &&
		   $('#stock-source-group').is(':visible');
}

function getTransferContext()
{
	var selectedSourceId = $('#source_stock_entry').val();
	var netWeight = parseFloat($('#net_weight').val()) || 0;
	var currentAmount = parseFloat(CurrentStockEntry.stock_entry.amount) || 0;
	var requiredIncrease = netWeight - currentAmount;

	var sourceEntry = null;
	var availableFromSource = 0;

	if (selectedSourceId && window.AvailableStockEntries) {
		sourceEntry = window.AvailableStockEntries.find(function(entry) {
			return entry.stock_id === selectedSourceId;
		});
		availableFromSource = sourceEntry ? parseFloat(sourceEntry.amount) : 0;
	}

	return {
		selectedSourceId: selectedSourceId,
		hasSourceSelected: !!selectedSourceId,
		sourceEntry: sourceEntry,
		netWeight: netWeight,
		currentAmount: currentAmount,
		requiredIncrease: requiredIncrease,
		availableFromSource: availableFromSource,
		sourceHasEnoughStock: availableFromSource >= requiredIncrease,
		remainingAmount: requiredIncrease - availableFromSource
	};
}

function hidePartialTransferUI()
{
	$('#partial-transfer-info').addClass('d-none');
	$('#stock-modification-option').addClass('d-none');
}

function showNoSourceOptions(context)
{
	$('#stock-modification-option').removeClass('d-none');
	$('#add_remaining').prop('checked', true);

	var baseText = __t('All %1$s will be added without a source transfer', formatAmountWithUnit(context.requiredIncrease));
	var warningHtml = checkWeightInconsistencyWarning(context.currentAmount, context.requiredIncrease);

	$('#remaining-modification-details').html(baseText + warningHtml);
}

function showPartialTransferOptions(context)
{
	$('#partial-transfer-info').removeClass('d-none');
	$('#partial-transfer-message').text(
		__t('Selected source only has %1$s available, but %2$s is needed',
			formatAmountWithUnit(context.availableFromSource),
			formatAmountWithUnit(context.requiredIncrease))
	);

	$('#stock-modification-option').removeClass('d-none');
	$('#add_remaining').prop('checked', true);

	updatePartialTransferDetails(context.availableFromSource, context.remainingAmount);
}

function updatePartialTransferDetails(availableFromSource, remaining)
{
	var selectedMode = $('input[name="partial_transfer_mode"]:checked').val();

	if (selectedMode === 'transfer_available_only') {
		var netWeightAfterTransfer = parseFloat(CurrentStockEntry.stock_entry.amount) + availableFromSource;
		$('#remaining-modification-details').text(
			__t('Transfer only %1$s from source (final amount will be %2$s)',
				formatAmountWithUnit(availableFromSource),
				formatAmountWithUnit(netWeightAfterTransfer))
		);
	} else {
		// add_remaining mode - check for weight inconsistency warning
		var currentAmount = parseFloat(CurrentStockEntry.stock_entry.amount);
		var baseText = __t('Transfer %1$s from source and add remaining %2$s without source',
			formatAmountWithUnit(availableFromSource),
			formatAmountWithUnit(remaining)
		);
		var warningHtml = checkWeightInconsistencyWarning(currentAmount, remaining);

		$('#remaining-modification-details').html(baseText + warningHtml);
	}
}

function handlePartialTransferMode()
{
	var selectedMode = $('input[name="partial_transfer_mode"]:checked').val();

	if (selectedMode === 'transfer_available_only') {
		adjustGrossWeightForAvailableTransfer();
	}
	// For 'add_remaining' mode, no gross weight adjustment needed
}

function adjustGrossWeightForAvailableTransfer()
{
	if (!isPartialTransferContextValid()) {
		return;
	}

	var context = getTransferContext();

	if (!context.hasSourceSelected || !context.sourceEntry) {
		return;
	}

	var targetNetWeight = context.currentAmount + context.availableFromSource;
	var targetGrossWeight = targetNetWeight + CurrentContainerWeight;

	// Update weights without triggering full scenario update
	updateWeightsDirectly(targetGrossWeight);

	// Update the UI to reflect the change
	updatePartialTransferInfo();
}

function updateWeightsDirectly(grossWeight)
{
	$('#gross_weight').val(formatAmount(grossWeight));

	var netWeight = grossWeight - CurrentContainerWeight;
	if (netWeight < 0) netWeight = 0;
	$('#net_weight').val(formatAmount(netWeight));
}

function clearForm(keepBarcode = false)
{
	currentBarcode = $('#container_scanner').val();

	$('#container-inventory-form').trigger('reset');

	$('#gross_weight, #net_weight, #source_stock_entry, #destination_stock_entry').val('');

	// Reset radio buttons to default
	$('#destination_consume').prop('checked', true);
	$('input[name="partial_transfer_mode"]').prop('checked', false);

	// Hide sections
	$('#container-details, #stock-source-group, #stock-destination-group, #destination-stock-entry, #partial-transfer-info, #stock-modification-option').addClass('d-none');
	$('#inventory-scenario').remove();

	// Reset state
	resetInventoryState();

	// Clear validation
	Grocy.FrontendHelpers.ValidateForm('container-inventory-form');

	if (keepBarcode)
	{
		$('#container_scanner').val(currentBarcode);
	} else {
		$('#container_scanner').val('');
		// Focus barcode input
		setTimeout(function()
		{
			$('#container_scanner').focus();
		}, Grocy.FormFocusDelay);
	}
}

function showError(message)
{
	toastr.error(message);
	setTimeout(function()
	{
		$('#container_scanner').focus().select();
	}, Grocy.FormFocusDelay);
}

// Cache for API data to avoid multiple calls
var CachedData = {
	products: null,
	locations: null,
	isLoading: false
};

function loadCachedData(callback)
{
	if (CachedData.products && CachedData.locations) {
		callback(CachedData.products, CachedData.locations);
		return;
	}

	if (CachedData.isLoading) {
		// Wait for current load to complete
		setTimeout(function() {
			loadCachedData(callback);
		}, 100);
		return;
	}

	CachedData.isLoading = true;

	// Load products and locations in parallel
	var loadedCount = 0;
	var totalToLoad = 2;

	Grocy.Api.Get('objects/products', function(products) {
		CachedData.products = products;
		loadedCount++;
		if (loadedCount === totalToLoad) {
			CachedData.isLoading = false;
			callback(CachedData.products, CachedData.locations);
		}
	});

	Grocy.Api.Get('objects/locations', function(locations) {
		CachedData.locations = locations;
		loadedCount++;
		if (loadedCount === totalToLoad) {
			CachedData.isLoading = false;
			callback(CachedData.products, CachedData.locations);
		}
	});
}

function loadRecentInventories()
{
	loadCachedData(function(products, locations) {
		// Create lookup maps
		var productMap = {};
		products.forEach(function(product) {
			productMap[product.id] = product.name;
		});

		var locationMap = {};
		locations.forEach(function(location) {
			locationMap[location.id] = location.name;
		});

		// Load recent stock log entries with container inventory transactions
		Grocy.Api.Get('objects/stock_log', function(stockLogEntries) {
			// Filter for container inventory transactions (they have notes containing "Container inventory")
			var containerEntries = stockLogEntries
				.filter(function(entry) {
					return entry.note && entry.note.includes('Container inventory');
				})
				.sort(function(a, b) {
					return new Date(b.row_created_timestamp) - new Date(a.row_created_timestamp);
				})
				.slice(0, 10); // Show last 10 entries

			var tableHtml = '';
			if (containerEntries.length === 0) {
				tableHtml = '<p class="text-muted">' + __t('No recent container inventories found') + '</p>';
			} else {
				tableHtml = '<div class="table-responsive"><table class="table table-sm table-striped">';
				tableHtml += '<thead><tr>';
				tableHtml += '<th>' + __t('Date') + '</th>';
				tableHtml += '<th>' + __t('Product') + '</th>';
				tableHtml += '<th>' + __t('Location') + '</th>';
				tableHtml += '<th>' + __t('Amount') + '</th>';
				tableHtml += '<th>' + __t('Type') + '</th>';
				tableHtml += '</tr></thead><tbody>';

				containerEntries.forEach(function(entry) {
					var date = moment(entry.row_created_timestamp).format('L LT');
					var amount = formatAmount(Math.abs(parseFloat(entry.amount)));
					var type = parseFloat(entry.amount) > 0 ? __t('Added') : __t('Removed');
					var typeClass = parseFloat(entry.amount) > 0 ? 'text-success' : 'text-danger';
					var productName = productMap[entry.product_id] || __t('Unknown');
					var locationName = locationMap[entry.location_id] || __t('Unknown');

					tableHtml += '<tr>';
					tableHtml += '<td>' + date + '</td>';
					tableHtml += '<td>' + productName + '</td>';
					tableHtml += '<td>' + locationName + '</td>';
					tableHtml += '<td>' + amount + '</td>';
					tableHtml += '<td class="' + typeClass + '">' + type + '</td>';
					tableHtml += '</tr>';
				});

				tableHtml += '</tbody></table></div>';
			}

			$('#recent-inventories-table').html(tableHtml);
		});
	});
}

// Initialize on page load
$(document).ready(function()
{
	// Focus on barcode input
	setTimeout(function()
	{
		$('#container_scanner').focus();
	}, Grocy.FormFocusDelay);

	// Initialize tooltips
	$('[data-toggle="tooltip"]').tooltip();

	// Load recent inventories
	loadRecentInventories();
});

// Handle barcode scanner integration
$(document).on("Grocy.BarcodeScanned", function(_, barcode, target)
{
	if (target !== "#container_scanner")
	{
		return;
	}

	$('#container_scanner').val(barcode);
	processBarcode(barcode);
});

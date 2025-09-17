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
	
	if (!Grocy.FrontendHelpers.ValidateForm("container-inventory-form", true))
	{
		return;
	}
	
	// Additional check: prevent submission if gross weight is invalid
	if ($('#gross_weight').hasClass('is-invalid'))
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
				$('#barcode_input').focus();
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


$('#barcode_input').on('blur', function()
{
	var barcode = $(this).val().trim();
	if (barcode.length > 0)
	{
		processBarcode(barcode);
	}
});

$('#barcode_input').on('keydown', function(e)
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

$('#gross_weight').on('input', function()
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
	}
});

$('#barcode_camera_button').on('click', function()
{
	Grocy.Components.BarcodeScanner.StartScanning(function(result)
	{
		$('#barcode_input').val(result);
		processBarcode(result);
	});
});

function processBarcode(barcode)
{
	var barcodeData = parseGrocycode(barcode);
	if (!barcodeData) return;
	
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
		loadAvailableStockEntries('source');
	}
	else if (difference < 0) // Stock decreased
	{
		scenarioHtml = createScenarioAlert('decrease', 'fa-minus-circle',
			__t('Stock decreased by %1$s. Please specify where this stock went.', formatAmountWithUnit(Math.abs(difference))));
		$('#stock-destination-group').removeClass('d-none');
		
		// Always reset to "Consumed" as default
		$('#destination_consume').prop('checked', true);
		$('#destination-stock-entry').addClass('d-none');
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
		});
	});
}

function clearForm()
{
	// Clear all input fields
	$('#barcode_input, #gross_weight, #net_weight, #source_stock_entry, #destination_stock_entry').val('');
	
	// Reset radio buttons to default
	$('#destination_consume').prop('checked', true);
	
	// Hide sections
	$('#container-details, #stock-source-group, #stock-destination-group, #destination-stock-entry').addClass('d-none');
	$('#inventory-scenario').remove();
	
	// Reset state
	resetInventoryState();
	
	// Clear validation
	Grocy.FrontendHelpers.ValidateForm('container-inventory-form');
	
	// Focus barcode input
	setTimeout(function()
	{
		$('#barcode_input').focus();
	}, Grocy.FormFocusDelay);
}

function showError(message)
{
	toastr.error(message);
	setTimeout(function()
	{
		$('#barcode_input').focus().select();
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
		$('#barcode_input').focus();
	}, Grocy.FormFocusDelay);
	
	// Initialize tooltips
	$('[data-toggle="tooltip"]').tooltip();
	
	// Load recent inventories
	loadRecentInventories();
});

// Handle barcode scanner integration 
$(document).on("Grocy.BarcodeScanned", function(_, barcode, target)
{
	if (target !== "#barcode_input")
	{
		return;
	}

	$('#barcode_input').val(barcode);
	processBarcode(barcode);
});
Grocy.Components.HomeAssistantScale = {};

Grocy.Components.HomeAssistantScale.Connection = null;
Grocy.Components.HomeAssistantScale.IsConnected = false;
Grocy.Components.HomeAssistantScale.ReconnectTimer = null;
Grocy.Components.HomeAssistantScale.ScaleEntityId = null;
Grocy.Components.HomeAssistantScale.HaUrl = null;
Grocy.Components.HomeAssistantScale.HaToken = null;

Grocy.Components.HomeAssistantScale.Connect = function()
{
	// Check if configuration is available
	if (!Grocy.Components.HomeAssistantScale.HaUrl || !Grocy.Components.HomeAssistantScale.HaToken || !Grocy.Components.HomeAssistantScale.ScaleEntityId)
	{
		console.log('Home Assistant scale integration: Missing configuration');
		return;
	}

	if (Grocy.Components.HomeAssistantScale.IsConnected)
	{
		return;
	}

	try
	{
		console.log('Home Assistant scale integration: Connecting to', Grocy.Components.HomeAssistantScale.HaUrl);
		
		// Create WebSocket connection to Home Assistant
		var wsUrl = Grocy.Components.HomeAssistantScale.HaUrl.replace(/^http/, 'ws') + '/api/websocket';
		var ws = new WebSocket(wsUrl);
		
		var messageId = 1;
		var authCompleted = false;

		ws.onopen = function()
		{
			console.log('Home Assistant scale integration: WebSocket connected');
		};

		ws.onmessage = function(event)
		{
			var message = JSON.parse(event.data);
			
			if (message.type === 'auth_required')
			{
				// Send authentication
				ws.send(JSON.stringify({
					type: 'auth',
					access_token: Grocy.Components.HomeAssistantScale.HaToken
				}));
			}
			else if (message.type === 'auth_ok')
			{
				console.log('Home Assistant scale integration: Authentication successful');
				authCompleted = true;
				Grocy.Components.HomeAssistantScale.IsConnected = true;
				
				// Subscribe to state changes for the scale entity
				ws.send(JSON.stringify({
					id: messageId++,
					type: 'subscribe_events',
					event_type: 'state_changed'
				}));
			}
			else if (message.type === 'auth_invalid')
			{
				console.error('Home Assistant scale integration: Authentication failed');
				Grocy.Components.HomeAssistantScale.Disconnect();
			}
			else if (message.type === 'event')
			{
				Grocy.Components.HomeAssistantScale.HandleStateChange(message.event);
			}
		};

		ws.onclose = function(event)
		{
			console.log('Home Assistant scale integration: WebSocket disconnected');
			Grocy.Components.HomeAssistantScale.IsConnected = false;
			Grocy.Components.HomeAssistantScale.Connection = null;
			
			// Attempt to reconnect after 5 seconds
			if (authCompleted)
			{
				clearTimeout(Grocy.Components.HomeAssistantScale.ReconnectTimer);
				Grocy.Components.HomeAssistantScale.ReconnectTimer = setTimeout(function()
				{
					Grocy.Components.HomeAssistantScale.Connect();
				}, 5000);
			}
		};

		ws.onerror = function(error)
		{
			console.error('Home Assistant scale integration: WebSocket error', error);
		};

		Grocy.Components.HomeAssistantScale.Connection = ws;
	}
	catch (error)
	{
		console.error('Home Assistant scale integration: Connection error', error);
	}
};

Grocy.Components.HomeAssistantScale.Disconnect = function()
{
	if (Grocy.Components.HomeAssistantScale.Connection)
	{
		Grocy.Components.HomeAssistantScale.Connection.close();
		Grocy.Components.HomeAssistantScale.Connection = null;
	}
	
	Grocy.Components.HomeAssistantScale.IsConnected = false;
	
	if (Grocy.Components.HomeAssistantScale.ReconnectTimer)
	{
		clearTimeout(Grocy.Components.HomeAssistantScale.ReconnectTimer);
		Grocy.Components.HomeAssistantScale.ReconnectTimer = null;
	}
};

Grocy.Components.HomeAssistantScale.HandleStateChange = function(event)
{
	// Only process state changes for our scale entity
	if (event.data && event.data.entity_id === Grocy.Components.HomeAssistantScale.ScaleEntityId)
	{
		var newState = event.data.new_state;
		
		if (newState && newState.state !== undefined && newState.attributes)
		{
			var newWeight = parseFloat(newState.state);
			var isStable = newState.attributes.is_stable === true;
			
			// Only process if the reading is stable and is a valid weight value
			if (isStable && !isNaN(newWeight))
			{
				console.log('Home Assistant scale integration: Stable weight detected:', newWeight);
				
				// Trigger weight update event
				$(document).trigger("Grocy.ScaleWeightChanged", [newWeight, newState.attributes]);
				
				// Auto-populate focused weight input immediately
				Grocy.Components.HomeAssistantScale.PopulateWeightInput(newWeight);
			}
			else if (!isStable)
			{
				console.log('Home Assistant scale integration: Weight reading not stable, ignoring:', newWeight);
			}
		}
	}
};

Grocy.Components.HomeAssistantScale.IsWeightInput = function(element)
{
	if (!element || !$(element).is('input')) return false;
	
	var $element = $(element);
	
	// Skip readonly or disabled inputs
	if ($element.prop('readonly') || $element.prop('disabled'))
	{
		return false;
	}
	
	var id = element.id || '';
	var name = element.name || '';
	var className = element.className || '';
	
	return (id.includes('weight') || id.includes('amount') || id.includes('quantity') ||
			name.includes('weight') || name.includes('amount') || name.includes('quantity') ||
			className.includes('weight') || className.includes('amount') || className.includes('quantity'));
};

Grocy.Components.HomeAssistantScale.FindTargetInput = function()
{
	// Priority 1: Explicitly marked waiting inputs
	var waitingInputs = $('input[data-ha-scale-target="true"]:not(.ha-scale-fulfilled)');
	if (waitingInputs.length > 0)
	{
		return waitingInputs.first();
	}
	
	// Priority 2: Currently focused weight input that isn't fulfilled
	var activeElement = document.activeElement;
	if (Grocy.Components.HomeAssistantScale.IsWeightInput(activeElement) && 
		!$(activeElement).hasClass('ha-scale-fulfilled'))
	{
		return $(activeElement);
	}
	
	return null;
};

Grocy.Components.HomeAssistantScale.GetExpectedUnit = function(inputElement)
{
	console.log('HA Scale: Detecting unit for input', inputElement.attr('id') || inputElement.attr('name'));
	
	// Look for unit display elements near the input
	var unitElement = inputElement.siblings('.input-group-text, .input-group-append .input-group-text');
	console.log('HA Scale: Found siblings unit elements:', unitElement.length);
	if (unitElement.length > 0)
	{
		var unit = unitElement.text().trim().toLowerCase();
		console.log('HA Scale: Unit from siblings:', unit);
		return unit;
	}
	
	// Look for unit in parent input group
	var inputGroup = inputElement.closest('.input-group');
	console.log('HA Scale: Found input group:', inputGroup.length > 0);
	if (inputGroup.length > 0)
	{
		var unitInGroup = inputGroup.find('.input-group-text, [id$="_unit"], [class*="unit"]');
		console.log('HA Scale: Found unit in group:', unitInGroup.length);
		unitInGroup.each(function(i, el) {
			console.log('HA Scale: Unit element', i, ':', $(el).text().trim());
		});
		
		if (unitInGroup.length > 0)
		{
			var unit = '';
			unitInGroup.each(function() {
				var text = $(this).text().trim();
				if (text && text.length > 0) {
					unit = text;
					return false; // break
				}
			});
			
			if (unit) {
				console.log('HA Scale: Unit from input group:', unit);
				return unit.toLowerCase();
			}
		}
	}
	
	// Look for nearby span or label with unit info
	var nearbyUnit = inputElement.parent().find('span[id$="_unit"], span[class*="unit"]');
	console.log('HA Scale: Found nearby unit elements:', nearbyUnit.length);
	if (nearbyUnit.length > 0)
	{
		var unit = nearbyUnit.text().trim().toLowerCase();
		console.log('HA Scale: Unit from nearby elements:', unit);
		return unit;
	}
	
	// Check for quantity unit selector (purchase flow)
	var quSelector = $('#qu_id');
	console.log('HA Scale: Found qu_id selector:', quSelector.length > 0);
	if (quSelector.length > 0)
	{
		var selectedOption = quSelector.find('option:selected');
		console.log('HA Scale: Selected option:', selectedOption.text().trim());
		if (selectedOption.length > 0)
		{
			var unit = selectedOption.text().trim();
			console.log('HA Scale: Unit from qu_id selector:', unit);
			if (unit && unit.length > 0)
			{
				return unit.toLowerCase();
			}
		}
	}
	
	// Check for productamountpicker unit display
	var amountPickerUnit = $('.input-group-productamountpicker').find('.input-group-text');
	console.log('HA Scale: Found productamountpicker unit:', amountPickerUnit.length > 0);
	if (amountPickerUnit.length > 0)
	{
		var unit = amountPickerUnit.text().trim();
		console.log('HA Scale: Unit from productamountpicker:', unit);
		if (unit && unit.length > 0)
		{
			return unit.toLowerCase();
		}
	}
	
	console.log('HA Scale: No unit found, defaulting to grams');
	// Default assumption: grams
	return 'g';
};

Grocy.Components.HomeAssistantScale.ConvertFromGrams = function(weightInGrams, toUnit)
{
	console.log('HA Scale: Converting', weightInGrams, 'grams to', toUnit);
	
	// Normalize unit
	toUnit = toUnit.toLowerCase();
	
	// If target is grams, no conversion needed
	if (toUnit === 'g' || toUnit === 'gram' || toUnit === 'grams')
	{
		return weightInGrams;
	}
	
	// Convert from grams to target unit
	var result = weightInGrams;
	switch(toUnit)
	{
		case 'kg':
		case 'kilo':
		case 'kilogram':
		case 'kilograms':
			result = weightInGrams / 1000;
			break;
		case 'lb':
		case 'lbs':
		case 'pound':
		case 'pounds':
			result = weightInGrams / 453.592;
			break;
		case 'oz':
		case 'ounce':
		case 'ounces':
			result = weightInGrams / 28.3495;
			break;
		default:
			console.log('HA Scale: Unknown unit:', toUnit, 'using grams');
			result = weightInGrams;
	}
	
	console.log('HA Scale: Converted result:', result, toUnit);
	return result;
};

Grocy.Components.HomeAssistantScale.PopulateWeightInput = function(weight)
{
	var targetInput = Grocy.Components.HomeAssistantScale.FindTargetInput();
	
	if (!targetInput)
	{
		console.log('Home Assistant scale integration: No eligible weight input found');
		return;
	}
	
	// Get the expected unit from UI
	var expectedUnit = Grocy.Components.HomeAssistantScale.GetExpectedUnit(targetInput);
	
	// Convert weight from grams to expected unit
	var convertedWeight = Grocy.Components.HomeAssistantScale.ConvertFromGrams(weight, expectedUnit);
	
	// Format the weight according to user settings
	var formattedWeight = convertedWeight.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: Grocy.UserSettings.stock_decimal_places_amounts || 4
	});
	
	console.log('Home Assistant scale integration: Converting', weight, 'grams to', convertedWeight, expectedUnit);
	
	// Set the value and trigger events
	targetInput.val(formattedWeight);
	targetInput.trigger('input');
	targetInput.trigger('change');
	
	// Mark as fulfilled and clean up state
	targetInput.addClass('ha-scale-fulfilled');
	targetInput.removeClass('ha-scale-waiting');
	targetInput.removeAttr('data-ha-scale-target');
	
	// Update the refresh button state
	Grocy.Components.HomeAssistantScale.UpdateRefreshButton(targetInput, true);
	
	// Show notification with conversion info
	if (typeof toastr !== 'undefined')
	{
		var message = __t('Weight updated from scale: %s %s', formattedWeight, expectedUnit);
		if (expectedUnit !== 'g' && expectedUnit !== 'gram' && expectedUnit !== 'grams')
		{
			message += ' (' + __t('converted from %s g', weight) + ')';
		}
		
		toastr.success(message, '', {
			timeOut: 3000,
			positionClass: 'toast-bottom-right'
		});
	}
};

Grocy.Components.HomeAssistantScale.ClearInput = function(inputElement)
{
	// Clear the input value and reset state
	inputElement.val('');
	inputElement.removeClass('ha-scale-fulfilled');
	
	// Update the refresh button state
	Grocy.Components.HomeAssistantScale.UpdateRefreshButton(inputElement, false);
	
	// Mark this input as the active target for weight updates
	inputElement.attr('data-ha-scale-target', 'true');
	inputElement.addClass('ha-scale-waiting');
	
	// Focus the input to wait for new stable value
	inputElement.focus();
	
	console.log('Home Assistant scale integration: Input cleared and ready for new weight');
	
	if (typeof toastr !== 'undefined')
	{
		toastr.info(__t('Input cleared - waiting for stable weight reading'), '', {
			timeOut: 2000,
			positionClass: 'toast-bottom-right'
		});
	}
};

Grocy.Components.HomeAssistantScale.UpdateRefreshButton = function(inputElement, isFulfilled)
{
	var refreshButton = inputElement.siblings('.ha-scale-refresh-btn');
	
	if (isFulfilled)
	{
		refreshButton.removeClass('btn-outline-secondary').addClass('btn-success')
			.html('<i class="fa-solid fa-refresh"></i>')
			.attr('title', 'Clear and wait for new weight');
	}
	else
	{
		refreshButton.removeClass('btn-success').addClass('btn-outline-secondary')
			.html('<i class="fa-solid fa-scale-balanced"></i>')
			.attr('title', 'Waiting for stable weight');
	}
};

Grocy.Components.HomeAssistantScale.LoadConfiguration = function()
{
	// Try to load configuration from user settings or local storage
	var haUrl = localStorage.getItem('grocy_ha_url') || '';
	var haToken = localStorage.getItem('grocy_ha_token') || '';
	var scaleEntityId = localStorage.getItem('grocy_ha_scale_entity_id') || '';
	
	if (haUrl && haToken && scaleEntityId)
	{
		Grocy.Components.HomeAssistantScale.HaUrl = haUrl;
		Grocy.Components.HomeAssistantScale.HaToken = haToken;
		Grocy.Components.HomeAssistantScale.ScaleEntityId = scaleEntityId;
		
		console.log('Home Assistant scale integration: Configuration loaded');
		return true;
	}
	
	console.log('Home Assistant scale integration: No configuration found');
	return false;
};

Grocy.Components.HomeAssistantScale.SaveConfiguration = function(haUrl, haToken, scaleEntityId)
{
	localStorage.setItem('grocy_ha_url', haUrl || '');
	localStorage.setItem('grocy_ha_token', haToken || '');
	localStorage.setItem('grocy_ha_scale_entity_id', scaleEntityId || '');
	
	Grocy.Components.HomeAssistantScale.HaUrl = haUrl;
	Grocy.Components.HomeAssistantScale.HaToken = haToken;
	Grocy.Components.HomeAssistantScale.ScaleEntityId = scaleEntityId;
	
	console.log('Home Assistant scale integration: Configuration saved');
};

Grocy.Components.HomeAssistantScale.AddStyles = function()
{
	if ($('#ha-scale-styles').length > 0) return; // Already added
	
	var styles = '<style id="ha-scale-styles">' +
		'.ha-scale-refresh-btn { margin-right: 0; } ' +
		'.ha-scale-waiting { border-color: #007bff !important; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important; } ' +
		'.ha-scale-fulfilled { border-color: #28a745 !important; } ' +
		'.ha-scale-refresh-btn.btn-success { color: #fff; } ' +
		'</style>';
	
	$('head').append(styles);
};

Grocy.Components.HomeAssistantScale.AddRefreshButtons = function()
{
	// Find all weight-related inputs using the helper function
	var allInputs = $('input[type="text"], input[type="number"], input:not([type])');
	
	allInputs.each(function()
	{
		var input = $(this);
		
		// Skip if not a weight input, readonly/disabled, or button already exists
		if (!Grocy.Components.HomeAssistantScale.IsWeightInput(this) || 
			input.siblings('.ha-scale-refresh-btn').length > 0)
		{
			return;
		}
		
		// Create refresh button
		var refreshButton = $('<button type="button" class="btn btn-sm btn-outline-secondary ha-scale-refresh-btn" title="Waiting for stable weight">' +
			'<i class="fa-solid fa-scale-balanced"></i>' +
			'</button>');
		
		// Add button before the input
		input.before(refreshButton);
		
		// Handle click event
		refreshButton.on('click', function(e)
		{
			e.preventDefault();
			Grocy.Components.HomeAssistantScale.ClearInput(input);
		});
	});
};

Grocy.Components.HomeAssistantScale.InitDone = false;
Grocy.Components.HomeAssistantScale.Init = function()
{
	if (Grocy.Components.HomeAssistantScale.InitDone)
	{
		return;
	}

	// Load configuration and connect if available
	if (Grocy.Components.HomeAssistantScale.LoadConfiguration())
	{
		Grocy.Components.HomeAssistantScale.Connect();
	}

	// Add refresh buttons to weight inputs
	Grocy.Components.HomeAssistantScale.AddRefreshButtons();

	// Add configuration UI globally
	Grocy.Components.HomeAssistantScale.AddConfigurationUI();
	
	// Add CSS for visual feedback
	Grocy.Components.HomeAssistantScale.AddStyles();

	Grocy.Components.HomeAssistantScale.InitDone = true;
};

Grocy.Components.HomeAssistantScale.HandleOAuthCallback = function()
{
	// Extract parameters from URL
	var urlParams = new URLSearchParams(window.location.search);
	var code = urlParams.get('code');
	
	if (code)
	{
		console.log('Home Assistant OAuth callback received, code:', code);
		toastr.success('Successfully connected to Home Assistant! Please configure your scale entity.');
		
		// Store the authorization code - in a real implementation you'd exchange this for tokens
		localStorage.setItem('grocy_ha_auth_code', code);
		
		// Clean up URL
		var cleanUrl = window.location.origin + window.location.pathname;
		window.history.replaceState({}, document.title, cleanUrl);
		
		// Show the configuration modal
		$('#ha-scale-config-modal').modal('show');
	}
	else
	{
		toastr.error('OAuth callback failed - no authorization code received');
	}
};

Grocy.Components.HomeAssistantScale.AddConfigurationUI = function()
{
	// Add configuration item to the top bar dropdown menu (before night mode settings)
	var nightModeItem = $('.dropdown-item:contains("Night mode")').first();
	if (nightModeItem.length > 0)
	{
		var configMenuHtml = '<a class="dropdown-item" href="#" id="ha-scale-config-menu" data-toggle="modal" data-target="#ha-scale-config-modal">' +
			'<i class="fa-solid fa-scale-balanced"></i> Home Assistant Scale' +
			'</a>' +
			'<div class="dropdown-divider"></div>';
		
		// Insert before the night mode section
		nightModeItem.before(configMenuHtml);
	}
	
	// Add modal for configuration
	var modalHtml = '<div class="modal fade" id="ha-scale-config-modal" tabindex="-1" role="dialog">' +
		'<div class="modal-dialog" role="document">' +
		'<div class="modal-content">' +
		'<div class="modal-header">' +
		'<h5 class="modal-title">Home Assistant Scale Configuration</h5>' +
		'<button type="button" class="close" data-dismiss="modal">' +
		'<span>&times;</span>' +
		'</button>' +
		'</div>' +
		'<div class="modal-body">' +
		'<div id="ha-oauth-section">' +
		'<div class="form-group text-center">' +
		'<a href="#" class="btn btn-primary" id="ha-oauth-connect" target="_blank">' +
		'<i class="fa-solid fa-home"></i> Connect with Home Assistant' +
		'</a>' +
		'<small class="form-text text-muted mt-2">Click to securely login through Home Assistant</small>' +
		'</div>' +
		'<div class="form-group text-center">' +
		'<small><a href="#" id="show-manual-token">Use manual token instead</a></small>' +
		'</div>' +
		'</div>' +
		'<div id="ha-manual-section" style="display:none;">' +
		'<div class="form-group">' +
		'<label for="ha-url">Home Assistant URL</label>' +
		'<input type="text" class="form-control" id="ha-url" placeholder="http://homeassistant.local:8123" value="' + (Grocy.Components.HomeAssistantScale.HaUrl || '') + '">' +
		'</div>' +
		'<div class="form-group">' +
		'<label for="ha-token">Long-lived Access Token</label>' +
		'<input type="password" class="form-control" id="ha-token" placeholder="Your HA access token" value="' + (Grocy.Components.HomeAssistantScale.HaToken || '') + '">' +
		'</div>' +
		'<div class="form-group text-center">' +
		'<small><a href="#" id="show-oauth-button">Use OAuth instead</a></small>' +
		'</div>' +
		'</div>' +
		'<div class="form-group">' +
		'<label for="ha-entity-id">Scale Entity ID</label>' +
		'<input type="text" class="form-control" id="ha-entity-id" placeholder="sensor.kitchen_scale" value="' + (Grocy.Components.HomeAssistantScale.ScaleEntityId || '') + '">' +
		'</div>' +
		'<div class="form-group">' +
		'<small class="form-text text-muted">Connection status: <span id="ha-connection-status">' + 
		(Grocy.Components.HomeAssistantScale.IsConnected ? 'Connected' : 'Not connected') + '</span></small>' +
		'</div>' +
		'</div>' +
		'<div class="modal-footer">' +
		'<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>' +
		'<button type="button" class="btn btn-primary" id="ha-config-save">Save & Connect</button>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>';
	
	// Only add modal if not already present
	if ($('#ha-scale-config-modal').length === 0)
	{
		$('body').append(modalHtml);
		
		// Set up OAuth URL
		var currentUrl = window.location.origin + window.location.pathname;
		var redirectUri = currentUrl + '?ha_auth=callback';
		var clientId = window.location.origin; // Use origin as client_id
		var oauthUrl = 'https://my.home-assistant.io/redirect/oauth?client_id=' + 
			encodeURIComponent(clientId) + '&redirect_uri=' + encodeURIComponent(redirectUri);
		
		$('#ha-oauth-connect').attr('href', oauthUrl);
		
		// Handle manual token toggle
		$(document).on('click', '#show-manual-token', function(e)
		{
			e.preventDefault();
			$('#ha-oauth-section').hide();
			$('#ha-manual-section').show();
		});
		
		// Handle OAuth button toggle
		$(document).on('click', '#show-oauth-button', function(e)
		{
			e.preventDefault();
			$('#ha-manual-section').hide();
			$('#ha-oauth-section').show();
		});
		
		// Check for OAuth callback on page load
		if (window.location.search.includes('ha_auth=callback'))
		{
			Grocy.Components.HomeAssistantScale.HandleOAuthCallback();
		}
		
		// Handle save button click
		$(document).on('click', '#ha-config-save', function()
		{
			var haUrl = $('#ha-url').val().trim();
			var haToken = $('#ha-token').val().trim();
			var scaleEntityId = $('#ha-entity-id').val().trim();
			
			if (haUrl && haToken && scaleEntityId)
			{
				Grocy.Components.HomeAssistantScale.Disconnect();
				Grocy.Components.HomeAssistantScale.SaveConfiguration(haUrl, haToken, scaleEntityId);
				Grocy.Components.HomeAssistantScale.Connect();
				
				$('#ha-scale-config-modal').modal('hide');
				toastr.success('Home Assistant scale configuration saved');
			}
			else
			{
				toastr.error('Please fill in all configuration fields');
			}
		});
		
		// Update connection status periodically
		setInterval(function()
		{
			$('#ha-connection-status').text(Grocy.Components.HomeAssistantScale.IsConnected ? 'Connected' : 'Not connected');
		}, 1000);
	}
};

// Initialize the component when the page loads
setTimeout(function()
{
	Grocy.Components.HomeAssistantScale.Init();
}, 100);

// Cleanup on page unload
$(window).on('beforeunload', function()
{
	Grocy.Components.HomeAssistantScale.Disconnect();
});
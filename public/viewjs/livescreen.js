$(document).ready(function() {
	// Detect if running in iframe and add class to body
	if (window !== window.top) {
		document.body.classList.add('in-iframe');
	}

	// Efficient activity-based control hiding
	const HIDE_DELAY = 3000; // ms
	let hideTimer = null;
	let lastMove = 0;
	let visible = true;
	let ticking = false;

	function setControlsVisible(state) {
		if (visible === state) return; // avoid unnecessary DOM changes
		visible = state;
		document.body.classList.toggle('controls-hidden', !state);
	}

	function scheduleHide() {
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => setControlsVisible(false), HIDE_DELAY);
	}

	function handleActivity() {
		const now = performance.now();
		if (now - lastMove < 100) return; // throttle to every 100ms
		lastMove = now;

		if (!ticking) {
			requestAnimationFrame(() => {
				setControlsVisible(true);
				scheduleHide();
				ticking = false;
			});
			ticking = true;
		}
	}

	// pointermove covers mouse + touch + pen
	document.addEventListener('pointermove', handleActivity);
	document.addEventListener('keydown', handleActivity);
	document.addEventListener('pointerdown', handleActivity);

	// start with controls hidden
	setControlsVisible(false);

	let eventSource;

	function connectSSE() {
		const statusEl = $('#connection-status');
		statusEl.removeClass('badge-success badge-danger').addClass('badge-warning').text('Connecting...');

		// Close existing connection
		if (eventSource) {
			eventSource.close();
		}

		console.log('Connecting to SSE endpoint...');
		eventSource = new EventSource(U('/api/live-activity'));

		eventSource.onopen = function(e) {
			console.log('SSE connection opened');
			statusEl.removeClass('badge-warning badge-danger').addClass('badge-success').text('Connected');
		};

		eventSource.onmessage = function(e) {
			console.log('SSE message received:', e.data);
			try {
				const data = JSON.parse(e.data);

				if (data.type === 'stock_activity') {
					// Always add the item (whether undone or not)
					addActivityItem(data.data);
				} else if (data.type === 'stock_undo') {
					// Handle undo event - mark existing item as undone
					handleUndoEvent(data.data);
				} else if (data.type === 'pending_scan') {
					// Handle pending scan event
					addPendingScanItem(data.data);
				} else if (data.type === 'pending_scan_resolved') {
					// Handle pending scan resolution
					handlePendingScanResolved(data.data);
				}
			} catch (err) {
				console.error('Error parsing SSE data:', err);
			}
		};

		eventSource.onerror = function(e) {
			console.error('SSE Error:', e);
			statusEl.removeClass('badge-success badge-warning').addClass('badge-danger').text('Connection Error');
			eventSource.close();

			// Reconnect after 1 seconds
			setTimeout(connectSSE, 1000);
		};
	}

	function addActivityItem(activity) {
		console.log('Adding activity item:', activity);
		const feedEl = $('#activity-feed');

		// Remove placeholder if exists
		feedEl.find('.activity-placeholder').remove();

		const timeAgo = getTimeAgo(activity.row_created_timestamp);
		const typeClass = getActivityTypeClass(activity.transaction_type);
		const amountText = getAmountText(activity);
		const priceHtml = getPriceHtml(activity);

		const currentAmountText = activity.current_amount ? `${activity.current_amount} ${getUnitName(activity, activity.current_amount)}` : 'Out of stock';
		// Format due date with amount and get urgency info
		let dueDateText = '';
		let dueDateClass = '';
		if (activity.next_due_date && activity.next_due_date_amount) {
			// Check if expiry date is more than 5 years in the future
			const now = new Date();
			const fiveYearsFromNow = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
			const expiryDate = new Date(activity.next_due_date);

			console.log('Debug dates:', {
				next_due_date: activity.next_due_date,
				expiryDate: expiryDate,
				fiveYearsFromNow: fiveYearsFromNow,
				isWithin5Years: expiryDate <= fiveYearsFromNow
			});

			if (expiryDate <= fiveYearsFromNow) {
				const dateInfo = getDateInfo(activity.next_due_date);
				const dueAmountText = `${activity.next_due_date_amount}`;
				dueDateText = `${dueAmountText} due ${dateInfo.text}`;
				dueDateClass = dateInfo.cssClass;
			}
		}

		// Check if item is already undone
		const isUndone = activity.undone === 1;
		const undoneClass = isUndone ? ' undone' : '';

		// Check if item is recent (within last minute)
		const isRecent = isWithinLastMinute(activity.row_created_timestamp);
		const recentClass = isRecent && !isUndone ? ' recent' : '';

		const undoElement = isUndone ? '' : `<button class="btn btn-sm btn-outline-secondary undo-btn" data-booking-id="${activity.id}" title="Undo transaction">
			<i class="fas fa-undo"></i>
		</button>`;

		const item = $(`
			<div class="activity-item ${typeClass}${undoneClass}${recentClass}" data-id="${activity.id}" data-timestamp="${activity.row_created_timestamp}">
				<div class="d-flex justify-content-between align-items-start mb-2">
					<strong>${activity.product_name}</strong>
					${undoElement}
				</div>
				<div class="activity-amount ${getAmountColorClass(typeClass)}">
					${amountText}
				</div>
				${priceHtml}
				<div class="stock-info mt-2">
					<div class="current-stock"><small class="text-muted"><i class="fas fa-box mr-1"></i><strong>${currentAmountText}</strong></small></div>
					<div class="due-date"><small class="text-muted"><strong class="${dueDateClass}">${dueDateText}</strong></small></div>
				</div>
				<div class="d-flex justify-content-between align-items-center mt-1">
					${activity.location_name ? `<small class="text-muted"><i class="fas fa-map-marker-alt mr-1"></i>${activity.location_name}</small>` : '<span></span>'}
					<small class="activity-time text-muted">${timeAgo}</small>
				</div>
			</div>
		`);

		// Add undo button click handler (only for non-undone items)
		if (!isUndone) {
			item.find('.undo-btn').on('click', function(e) {
				e.preventDefault();
				const bookingId = $(this).data('booking-id');
				undoBooking(bookingId, item);
			});
		}

		// Add to beginning of feed to show newest first
		feedEl.prepend(item);

		// Keep only first 20 items (newest ones) for widescreen grid
		const items = feedEl.find('.activity-item');
		if (items.length > 20) {
			items.slice(20).remove();
		}
	}


	function getActivityTypeClass(transactionType) {
		if (transactionType === 'consume') return 'consume';
		if (transactionType === 'purchase' || transactionType === 'inventory-correction' || transactionType === 'self-production') return 'purchase';
		if (transactionType === 'transfer_from' || transactionType === 'transfer_to') return 'transfer';
		if (transactionType === 'product-opened') return 'product-opened';
		if (transactionType === 'stock-edit-old' || transactionType === 'stock-edit-new') return 'stock-edit';
		return '';
	}

	function getAmountColorClass(typeClass) {
		if (typeClass === 'consume') return 'text-danger';
		if (typeClass === 'purchase') return 'text-success';
		if (typeClass === 'transfer') return 'text-warning';
		if (typeClass === 'product-opened') return 'text-primary';
		if (typeClass === 'stock-edit') return 'text-purple';
		return '';
	}

	function getAmountText(activity) {
		const amount = Math.abs(parseFloat(activity.amount));
		const unit = getUnitName(activity, amount);

		if (activity.transaction_type === 'consume') {
			return `−${amount} ${unit}`;
		} else if (activity.transaction_type === 'purchase' || activity.transaction_type === 'inventory-correction' || activity.transaction_type === 'self-production') {
			return `+${amount} ${unit}`;
		} else if (activity.transaction_type === 'transfer_from') {
			return `← ${amount} ${unit}`;
		} else if (activity.transaction_type === 'transfer_to') {
			return `→ ${amount} ${unit}`;
		} else if (activity.transaction_type === 'product-opened') {
			return `<i class="fas fa-box-open"></i> ${amount} ${unit}`;
		} else if (activity.transaction_type === 'stock-edit-old') {
			return `<i class="fas fa-edit"></i> −${amount} ${unit}`;
		} else if (activity.transaction_type === 'stock-edit-new') {
			return `<i class="fas fa-edit"></i> +${amount} ${unit}`;
		}
		return `${amount} ${unit}`;
	}

	function getPriceHtml(activity) {
		const priceEach = activity.price !== null && activity.price !== undefined ? parseFloat(activity.price) : NaN;
		if (!Number.isFinite(priceEach) || priceEach <= 0) {
			return '';
		}

		const unitName = activity.qu_name || getUnitName(activity, 1);
		const perUnitText = unitName ? `${formatCurrency(priceEach)} / ${unitName}` : formatCurrency(priceEach);

		return `
			<div class="activity-price mt-1">
				<i class="fas fa-coins mr-2 text-muted"></i>
				<span class="price-amount">${perUnitText}</span>
			</div>
		`;
	}

	function formatCurrency(value) {
		if (!Number.isFinite(value)) {
			return '';
		}

		try {
			if (window.Grocy && Grocy.Currency) {
				const decimals = Grocy.UserSettings ? Grocy.UserSettings.stock_decimal_places_prices_display : 2;
				return value.toLocaleString(undefined, {
					style: 'currency',
					currency: Grocy.Currency,
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				});
			}
		} catch (e) { }

		return value.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function getUnitName(activity, amount) {
		if (amount === 1) {
			return activity.qu_name || '';
		} else {
			return activity.qu_name_plural || activity.qu_name || '';
		}
	}

	function getTimeAgo(dateString) {
		if (!dateString) return 'Just now';

		const now = new Date();
		const activityDate = new Date(dateString);

		const diffMs = now - activityDate;
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);
		const diffHours = Math.floor(diffMins / 60);

		if (diffSecs < 60) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return activityDate.toLocaleDateString();
	}

	function isWithinLastMinute(dateString) {
		if (!dateString) return false;

		const now = new Date();
		const activityDate = new Date(dateString);
		const diffMs = now - activityDate;
		const diffSecs = Math.floor(diffMs / 1000);

		return diffSecs < 60;
	}

	function getDateInfo(dateString) {
		if (!dateString) return { text: 'No expiry', cssClass: '' };

		// Calculate days from now
		const now = new Date();
		const dueDate = new Date(dateString);
		const diffTime = dueDate - now;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) {
			return {
				text: `${Math.abs(diffDays)} days ago`,
				cssClass: 'text-danger font-weight-bold'
			};
		} else if (diffDays === 0) {
			return {
				text: 'today',
				cssClass: 'text-danger font-weight-bold'
			};
		} else if (diffDays === 1) {
			return {
				text: 'tomorrow',
				cssClass: 'text-warning font-weight-bold'
			};
		} else if (diffDays <= 14) {
			return {
				text: `in ${diffDays} days`,
				cssClass: ''
			};
		} else if (diffDays <= 60) {
			const weeks = Math.round(diffDays / 7);
			return {
				text: `in ${weeks} week${weeks === 1 ? '' : 's'}`,
				cssClass: ''
			};
		} else if (diffDays <= 730) {
			const months = Math.round(diffDays / 30.44); // Average days per month
			return {
				text: `in ${months} month${months === 1 ? '' : 's'}`,
				cssClass: ''
			};
		} else {
			const years = Math.round(diffDays / 365.25); // Average days per year
			return {
				text: `in ${years} year${years === 1 ? '' : 's'}`,
				cssClass: ''
			};
		}
	}

	function undoBooking(bookingId, itemElement) {
		// Disable the undo button to prevent double clicks
		const undoBtn = itemElement.find('.undo-btn');
		undoBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

		// Make API call to undo the booking
		$.ajax({
			url: U('/api/stock/bookings/' + bookingId + '/undo'),
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			success: function() {
				// Mark item as undone
				markItemAsUndone(itemElement);
			},
			error: function(xhr, status, error) {
				console.error('Failed to undo booking:', error);
				// Re-enable button on error
				undoBtn.prop('disabled', false).html('<i class="fas fa-undo"></i>');
				// Could show an error message here
			}
		});
	}

	function markItemAsUndone(itemElement) {
		// Add undone styling
		itemElement.addClass('undone');
		// Remove undo button entirely
		itemElement.find('.undo-btn').remove();
	}

	function handleUndoEvent(undoData) {
		// Find the corresponding item in the feed by booking ID
		const existingItem = $(`.activity-item[data-id="${undoData.booking_id}"]`);
		if (existingItem.length > 0) {
			markItemAsUndone(existingItem);
		}
	}

	function handlePendingScanResolved(resolvedData) {
		// Find the corresponding pending scan item by ID
		const existingItem = $(`.activity-item[data-id="pending-${resolvedData.id}"]`);
		if (existingItem.length > 0) {
			markPendingScanAsResolved(existingItem);
		}
	}

	function markPendingScanAsResolved(itemElement) {
		// Add resolved styling
		itemElement.addClass('resolved');
		// Remove recent class if present
		itemElement.removeClass('recent');
	}

	function addPendingScanItem(pendingScan) {
		console.log('Adding pending scan item:', pendingScan);
		const feedEl = $('#activity-feed');

		// Remove placeholder if exists
		feedEl.find('.activity-placeholder').remove();

		// Get operation color class
		const operationClass = getPendingScanOperationClass(pendingScan.operation);
		const amountColorClass = getPendingScanAmountColorClass(operationClass);

		// Check if item is recent (within last minute)
		const isRecent = isWithinLastMinute(pendingScan.timestamp);
		const recentClass = isRecent ? ' recent' : '';

		// Check if item is resolved
		const isResolved = pendingScan.resolved === 1 || pendingScan.resolved === true;
		const resolvedClass = isResolved ? ' resolved' : '';

		// Format the error message for display
		const shortErrorMessage = pendingScan.error_message.length > 80
			? pendingScan.error_message.substring(0, 80) + '...'
			: pendingScan.error_message;

		// Create the activity item HTML
		const itemHtml = `
			<div class="activity-item pending-scan ${operationClass}${recentClass}${resolvedClass}" data-id="pending-${pendingScan.id}" data-timestamp="${pendingScan.timestamp}">
				<strong>${pendingScan.operation.charAt(0).toUpperCase() + pendingScan.operation.slice(1)}</strong>
				<small class="text-muted">Pending Scan</small>
				<div class="activity-amount ${amountColorClass}">
					${pendingScan.barcode}
				</div>
				<div class="activity-time">${getTimeAgo(pendingScan.timestamp)}</div>
				<div class="stock-info">
					<small class="text-danger scan-error-text">${shortErrorMessage}</small>
					<a href="${U('/pendingscan/')}${pendingScan.id}" class="btn btn-sm btn-info" title="View details">
						<i class="fas fa-eye"></i>
					</a>
				</div>
			</div>
		`;

		// Add to the beginning of the feed
		feedEl.prepend(itemHtml);

		// Limit the number of items (remove old ones)
		const items = feedEl.find('.activity-item');
		if (items.length > 50) {
			items.slice(50).remove();
		}
	}

	function getPendingScanOperationClass(operation) {
		if (operation === 'consume') return 'consume';
		if (operation === 'add' || operation === 'inventory') return 'purchase';
		if (operation === 'transfer') return 'transfer';
		if (operation === 'open') return 'product-opened';
		return 'stock-edit'; // fallback
	}

	function getPendingScanAmountColorClass(operationClass) {
		if (operationClass === 'consume') return 'text-danger';
		if (operationClass === 'purchase') return 'text-success';
		if (operationClass === 'transfer') return 'text-warning';
		if (operationClass === 'product-opened') return 'text-primary';
		return 'text-purple';
	}

	function updateTimestamps() {
		$('.activity-item').each(function() {
			const item = $(this);

			// Get original timestamp from the activity data stored in a data attribute
			const timestamp = item.data('timestamp');
			if (timestamp) {
				const timeAgo = getTimeAgo(timestamp);
				item.find('.activity-time').text(timeAgo);

				// Update recent highlighting
				const isRecent = isWithinLastMinute(timestamp);
				const isUndone = item.hasClass('undone');
				if (isRecent && !isUndone) {
					item.addClass('recent');
				} else {
					item.removeClass('recent');
				}
			}
		});
	}

	// Start SSE connection (stats will be sent automatically on connect)
	connectSSE();

	// Update timestamps every minute
	setInterval(updateTimestamps, 60000);

	// Clean up on page unload
	$(window).on('beforeunload', function() {
		if (eventSource) {
			eventSource.close();
		}
	});
});

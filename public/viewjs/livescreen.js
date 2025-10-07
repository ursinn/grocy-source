$(document).ready(function() {
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

		const currentAmountText = activity.current_amount ? `${activity.current_amount} ${getUnitName(activity, activity.current_amount)}` : 'N/A';
		const dueDateText = activity.next_due_date ? getDateText(activity.next_due_date) : 'No expiry';

		// Check if item is already undone
		const isUndone = activity.undone === 1;
		const undoneClass = isUndone ? ' undone' : '';
		const undoBtnClass = isUndone ? 'btn-success' : 'btn-outline-secondary';
		const undoBtnIcon = isUndone ? 'fas fa-check' : 'fas fa-undo';
		const undoBtnDisabled = isUndone ? 'disabled' : '';

		const item = $(`
			<div class="activity-item ${typeClass}${undoneClass}" data-id="${activity.id}" data-timestamp="${activity.row_created_timestamp}">
				<div class="d-flex justify-content-between align-items-start mb-2">
					<strong>${activity.product_name}</strong>
					<button class="btn btn-sm ${undoBtnClass} undo-btn" data-booking-id="${activity.id}" title="Undo transaction" ${undoBtnDisabled}>
						<i class="${undoBtnIcon}"></i>
					</button>
				</div>
				<div class="activity-amount ${typeClass === 'consume' ? 'text-danger' : typeClass === 'purchase' ? 'text-success' : typeClass === 'transfer' ? 'text-warning' : ''}">
					${amountText}
				</div>
				<div class="stock-info mt-2">
					<div class="current-stock"><small class="text-muted">Stock: <strong>${currentAmountText}</strong></small></div>
					<div class="due-date"><small class="text-muted">Due: <strong>${dueDateText}</strong></small></div>
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
		if (transactionType === 'purchase' || transactionType === 'inventory-correction') return 'purchase';
		if (transactionType === 'transfer_from' || transactionType === 'transfer_to') return 'transfer';
		return '';
	}

	function getAmountText(activity) {
		const amount = Math.abs(parseFloat(activity.amount));
		const unit = getUnitName(activity, amount);

		if (activity.transaction_type === 'consume') {
			return `−${amount} ${unit}`;
		} else if (activity.transaction_type === 'purchase' || activity.transaction_type === 'inventory-correction') {
			return `+${amount} ${unit}`;
		} else if (activity.transaction_type === 'transfer_from') {
			return `← ${amount} ${unit}`;
		} else if (activity.transaction_type === 'transfer_to') {
			return `→ ${amount} ${unit}`;
		}
		return `${amount} ${unit}`;
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

		// Database stores UTC time, but the string format doesn't have timezone info
		// Treat the timestamp as UTC and convert to local time
		const utcString = dateString.replace(' ', 'T') + 'Z'; // Add 'Z' to indicate UTC
		const activityDate = new Date(utcString);

		const diffMs = now - activityDate;
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);
		const diffHours = Math.floor(diffMins / 60);

		if (diffSecs < 60) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return activityDate.toLocaleDateString();
	}

	function getDateText(dateString) {
		if (!dateString) return 'No expiry';
		return dateString; // Return YYYY-MM-DD format as stored in database
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
			success: function(response) {
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
		// Change button to green checkmark and disable
		itemElement.find('.undo-btn').prop('disabled', true).html('<i class="fas fa-check"></i>').removeClass('btn-outline-secondary').addClass('btn-success');
	}

	function handleUndoEvent(undoData) {
		// Find the corresponding item in the feed by booking ID
		const existingItem = $(`.activity-item[data-id="${undoData.booking_id}"]`);
		if (existingItem.length > 0) {
			markItemAsUndone(existingItem);
		}
	}

	function updateTimestamps() {
		$('.activity-item').each(function() {
			const item = $(this);
			const activityId = item.data('id');

			// Get original timestamp from the activity data stored in a data attribute
			const timestamp = item.data('timestamp');
			if (timestamp) {
				const timeAgo = getTimeAgo(timestamp);
				item.find('.activity-time').text(timeAgo);
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

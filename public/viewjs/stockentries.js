console.log("stockentries.js loaded");

var stockEntriesTable = $('#stockentries-table').DataTable({
	'order': [[2, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, "targets": 0 },
		{ 'visible': false, 'targets': 10 },
		{ "type": "custom-sort", "targets": 3 },
		{ "type": "html", "targets": 4 },
		{ "type": "custom-sort", "targets": 7 },
		{ "type": "html", "targets": 8 },
		{ "type": "html", "targets": 9 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#stockentries-table tbody').removeClass("d-none");
stockEntriesTable.columns.adjust().draw();

$(document).on("click", ".stock-entry-context-menu-button", function(e)
{
	e.preventDefault();

	var button = $(e.currentTarget);
	var modal = $("#stockentry-context-menu");

	// Update Data
	var stockEntryId = button.attr("data-stock-entry-id");
	var productId = button.attr("data-product-id");
	var productName = button.attr("data-product-name");
	var productQuName = button.attr("data-product-qu-name");
	var stockId = button.attr("data-stock-id");
	var stockRowId = button.attr("data-stockrow-id");
	var locationId = button.attr("data-location-id");
	var amount = button.attr("data-amount");
	var spoiledText = button.attr("data-spoiled-text");
	var grocycodeUrl = button.attr("data-grocycode-url");
	var labelUrl = button.attr("data-label-url");
	var consumeUrl = button.attr("data-consume-url");
	var transferUrl = button.attr("data-transfer-url");

	modal.find(".product-name").text(productName);
	modal.find(".spoiled-text").text(spoiledText);

	// Update Links
	modal.find("a[data-href-template]").each(function()
	{
		var link = $(this);
		var template = link.data("href-template");

		if (template.includes("recipes?search="))
		{
			link.attr("href", template + encodeURIComponent(productName));
		}
		else if (template.includes("summary?embedded&product="))
		{
			link.attr("href", template + productId);
		}
		else if (template.includes("shoppinglistitem/new"))
		{
			link.attr("href", template + productId);
		}
		else if (template.includes("purchase?embedded"))
		{
			link.attr("href", template + productId);
		}
		else if (template.includes("inventory?embedded"))
		{
			link.attr("href", template + productId);
		}
		else if (template.includes("stockjournal?embedded"))
		{
			link.attr("href", template + productId);
		}
		else if (template.includes("product/"))
		{
			link.attr("href", template + productId);
		}

		if (link.hasClass("link-return"))
		{
			link.data("href", template + productId);
		}
	});

	// Specific Link Updates
	modal.find(".stock-consume-link").attr("href", consumeUrl);
	modal.find(".stock-transfer-link").attr("href", transferUrl);
	modal.find(".stock-grocycode-link").attr("href", grocycodeUrl);
	modal.find(".stockentry-label-link").attr("href", labelUrl);

	// Buttons needing data attributes
	var spoiledButton = modal.find(".stock-consume-button-spoiled");
	spoiledButton.attr("data-product-id", productId);
	spoiledButton.attr("data-product-name", productName);
	spoiledButton.attr("data-product-qu-name", productQuName);
	spoiledButton.attr("data-stock-id", stockId);
	spoiledButton.attr("data-stockrow-id", stockRowId);
	spoiledButton.attr("data-location-id", locationId);
	spoiledButton.attr("data-consume-amount", amount);

	modal.find(".productcard-trigger").attr("data-product-id", productId);

	modal.modal("show");
});

$("#productcard-modal").on("hidden.bs.modal", function(e)
{
	if ($("#stockentry-context-menu").hasClass("show"))
	{
		$("body").addClass("modal-open");
	}
});

$(document).on('click', '.stock-consume-button', function(e)
{
	e.preventDefault();

	var productId = $(e.currentTarget).attr('data-product-id');
	var stockId = $(e.currentTarget).attr('data-stock-id');
	var stockRowId = $(e.currentTarget).attr('data-stockrow-id');
	var locationId = $(e.currentTarget).attr('data-location-id');
	var productName = $(e.currentTarget).attr('data-product-name');
	var productQuName = $(e.currentTarget).attr('data-product-qu-name');
	var consumeAmount = $(e.currentTarget).attr('data-consume-amount');
	var wasSpoiled = $(e.currentTarget).hasClass("stock-consume-button-spoiled");

	if (wasSpoiled)
	{
		consumeAmount = 1;
	}

	bootbox.dialog({
		message: __t('Are you sure to consume %1$s %2$s of %3$s?', consumeAmount, productQuName, productName),
		title: __t('Consume'),
		buttons: {
			danger: {
				label: __t('Yes'),
				className: "btn-danger",
				callback: function()
				{
					Grocy.FrontendHelpers.BeginUiBusy();

					Grocy.Api.Post('stock/products/' + productId + '/consume', { 'amount': consumeAmount, 'stock_entry_id': stockRowId, 'spoiled': wasSpoiled },
						function(result)
						{
							RefreshStockEntryRow(stockRowId);
							Grocy.FrontendHelpers.EndUiBusy();
							toastr.success(__t('Removed %1$s %2$s of %3$s from stock', consumeAmount, productQuName, productName) + '<br><a class="btn btn-secondary btn-sm mt-2" href="#" onclick="UndoStockBookingEntry(' + result[0].id + ', ' + stockRowId + ', ' + productId + ')"><i class="fa-solid fa-undo"></i> ' + __t("Undo") + '</a>');
							$("#stockentry-context-menu").modal("hide");
						},
						function(xhr)
						{
							Grocy.FrontendHelpers.EndUiBusy();
							console.error(xhr);
						}
					);
				}
			},
			cancel: {
				label: __t('No'),
				className: "btn-secondary",
				callback: function()
				{
					bootbox.hideAll();
				}
			}
		}
	});
});

$(document).on('click', '.product-open-button', function(e)
{
	e.preventDefault();

	var button = $(e.currentTarget);
	var productId = button.attr('data-product-id');
	var productName = button.attr('data-product-name');
	var productQuName = button.attr('data-product-qu-name');
	var stockId = button.attr('data-stock-id');
	var stockRowId = button.attr('data-stockrow-id');
	var openAmount = button.attr('data-open-amount');

	bootbox.dialog({
		message: __t('Are you sure to mark %1$s %2$s of %3$s as opened?', openAmount, productQuName, productName),
		title: __t('Mark as opened'),
		buttons: {
			danger: {
				label: __t('Yes'),
				className: "btn-danger",
				callback: function()
				{
					Grocy.FrontendHelpers.BeginUiBusy();

					Grocy.Api.Post('stock/products/' + productId + '/open', { 'amount': openAmount, 'stock_entry_id': stockRowId },
						function(result)
						{
							RefreshStockEntryRow(stockRowId);
							Grocy.FrontendHelpers.EndUiBusy();
							toastr.success(__t('Marked %1$s %2$s of %3$s as opened', openAmount, productQuName, productName) + '<br><a class="btn btn-secondary btn-sm mt-2" href="#" onclick="UndoStockBookingEntry(' + result[0].id + ', ' + stockRowId + ', ' + productId + ')"><i class="fa-solid fa-undo"></i> ' + __t("Undo") + '</a>');
						},
						function(xhr)
						{
							Grocy.FrontendHelpers.EndUiBusy();
							console.error(xhr);
						}
					);
				}
			},
			cancel: {
				label: __t('No'),
				className: "btn-secondary",
				callback: function()
				{
					bootbox.hideAll();
				}
			}
		}
	});
});

$(document).on('change', '#location-filter', function(e)
{
	var value = $(this).val();
	if (value == "all")
	{
		stockEntriesTable.column(5).search("").draw();
	}
	else
	{
		stockEntriesTable.column(5).search($(this).find('option:selected').text()).draw();
	}
});

$(document).on('click', '#clear-filter-button', function(e)
{
	Grocy.Components.ProductPicker.Clear();
	$('#location-filter').val("all");
	stockEntriesTable.column(1).search("").draw();
	stockEntriesTable.column(5).search("").draw();
});

if (Grocy.Components.ProductPicker)
{
	Grocy.Components.ProductPicker.GetPicker().on('change', function(e)
	{
		var value = $(this).val();
		console.log("Product picker changed to: " + value);
		if (value == "all" || value == "" || value == null)
		{
			stockEntriesTable.column(1).search("").draw();
		}
		else
		{
			console.log("Filtering stock entries table for: xx" + value + "xx");
			stockEntriesTable.column(1).search("xx" + NormalizeString(value) + "xx").draw();
		}
	});
}

function RefreshStockEntryRow(stockRowId)
{
	Grocy.Api.Get('stock/entries/' + stockRowId,
		function(result)
		{
			var stockRow = $('#stock-' + stockRowId + '-row');
			var productId = stockRow.find('.stock-consume-button').attr('data-product-id');

			// If the stock entry is now gone, remove the row
			if (result == null || result.amount == 0)
			{
				stockRow.fadeOut(500, function()
				{
					$(this).remove();
				});

				return;
			}

			stockRow.find('.stock-consume-button').attr('data-consume-amount', result.amount);
			stockRow.find('.product-open-button').attr('data-open-amount', result.amount);
			stockRow.find('.stock-entry-context-menu-button').attr('data-amount', result.amount);

			$('#stock-' + stockRowId + '-amount').text(result.amount);
			RefreshLocaleNumberDisplay('#stock-' + stockRowId + '-amount');

			if (result.open == 1)
			{
				$('#stock-' + stockRowId + '-opened-amount').text(__t("Opened"));
				$(".product-open-button[data-stockrow-id='" + stockRowId + "']").addClass("disabled");
			}
			else
			{
				$('#stock-' + stockRowId + '-opened-amount').text("");
				$(".product-open-button[data-stockrow-id='" + stockRowId + "']").removeClass("disabled");
			}

			// Needs to be delayed because of the animation above the date-text would be wrong if fired immediately...
			setTimeout(function()
			{
				RefreshContextualTimeago("#stock-" + stockRowId + "-row");
				RefreshLocaleNumberDisplay("#stock-" + stockRowId + "-row");
			}, Grocy.FormFocusDelay);
		},
		function(xhr)
		{
			Grocy.FrontendHelpers.EndUiBusy();
			console.error(xhr);
		}
	);
}

$(window).on("message", function(e)
{
	var data = e.originalEvent.data;

	if (data.Message == "ProductChanged")
	{
		$(".stock-consume-button[data-product-id='" + data.Payload + "']").each(function()
		{
			RefreshStockEntryRow($(this).attr("data-stockrow-id"));
		});
	};
});

if (Grocy.Components.ProductPicker)
{
	Grocy.Components.ProductPicker.GetPicker().trigger('change');
}

function UndoStockBookingEntry(bookingId, stockRowId, productId)
{
	Grocy.Api.Post('stock/bookings/' + bookingId.toString() + '/undo', {},
		function(result)
		{
			Grocy.GetTopmostWindow().postMessage(WindowMessageBag("BroadcastMessage", WindowMessageBag("ProductChanged", productId)), Grocy.BaseUrl);
			toastr.success(__t("Booking successfully undone"));
		},
		function(xhr)
		{
			console.error(xhr);
		}
	);
};

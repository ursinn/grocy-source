Grocy.Components.TransferLocationPicker = {};

Grocy.Components.TransferLocationPicker.GetPicker = function()
{
	return $('#location_id_to');
}

Grocy.Components.TransferLocationPicker.GetInputElement = function()
{
	return $('#location_id_to_text_input');
}

Grocy.Components.TransferLocationPicker.GetValue = function()
{
	return $('#location_id_to').val();
}

Grocy.Components.TransferLocationPicker.SetValue = function(value)
{
	Grocy.Components.TransferLocationPicker.GetInputElement().val(value);
	Grocy.Components.TransferLocationPicker.GetInputElement().trigger('change');
}

Grocy.Components.TransferLocationPicker.SetId = function(value)
{
	Grocy.Components.TransferLocationPicker.GetPicker().val(value);
	Grocy.Components.TransferLocationPicker.GetPicker().data('combobox').refresh();
	Grocy.Components.TransferLocationPicker.GetInputElement().trigger('change');
}

Grocy.Components.TransferLocationPicker.Clear = function()
{
	Grocy.Components.TransferLocationPicker.SetValue('');
	Grocy.Components.TransferLocationPicker.SetId(null);
	$('#location_id_to').attr("barcode", "null");
}

Grocy.Components.TransferLocationPicker.FinishFlow = function()
{
	RemoveUriParam("flow");
	RemoveUriParam("barcode");
	RemoveUriParam("product-name");
}

Grocy.Components.TransferLocationPicker.ShowCustomError = function(text)
{
	var element = $("#custom-transferlocationpicker-error");
	element.text(text);
	element.removeClass("d-none");
}

Grocy.Components.TransferLocationPicker.HideCustomError = function()
{
	$("#custom-transferlocationpicker-error").addClass("d-none");
}

Grocy.Components.TransferLocationPicker.Disable = function()
{
	Grocy.Components.TransferLocationPicker.GetInputElement().attr("disabled", "");
	$("#camerabarcodescanner-start-button").attr("disabled", "");
	$("#camerabarcodescanner-start-button").addClass("disabled");
}

Grocy.Components.TransferLocationPicker.Enable = function()
{
	Grocy.Components.TransferLocationPicker.GetInputElement().removeAttr("disabled");
	$("#camerabarcodescanner-start-button").removeAttr("disabled");
	$("#camerabarcodescanner-start-button").removeClass("disabled");
}

$('.transferlocation-combobox').combobox({
	appendId: '_text_input',
	bsVersion: '4',
	clearIfNoMatch: false
});

var prefillProduct = GetUriParam('product-name');
var prefillProduct2 = Grocy.Components.TransferLocationPicker.GetPicker().parent().data('prefill-by-name').toString();
if (prefillProduct2)
{
	prefillProduct = prefillProduct2;
}
if (typeof prefillProduct !== "undefined")
{
	var possibleOptionElement = $("#location_id_to option[data-additional-searchdata*=\"" + prefillProduct + "\"]").first();
	if (possibleOptionElement.length === 0)
	{
		possibleOptionElement = $("#location_id_to option:contains(\"" + prefillProduct + "\")").first();
	}

	if (possibleOptionElement.length > 0)
	{
		$('#location_id_to').val(possibleOptionElement.val());
		$('#location_id_to').data('combobox').refresh();
		$('#location_id_to').trigger('change');

		var nextInputElement = $(Grocy.Components.TransferLocationPicker.GetPicker().parent().data('next-input-selector').toString());
		nextInputElement.focus();
	}
}

var prefillProductId = GetUriParam("product");
var prefillProductId2 = Grocy.Components.TransferLocationPicker.GetPicker().parent().data('prefill-by-id').toString();
if (prefillProductId2)
{
	prefillProductId = prefillProductId2;
}
if (typeof prefillProductId !== "undefined")
{
	$('#location_id_to').val(prefillProductId);

	if ($('#location_id_to').val() != null)
	{
		$('#location_id_to').data('combobox').refresh();
		$('#location_id_to').trigger('change');

		var nextInputElement = $(Grocy.Components.TransferLocationPicker.GetPicker().parent().data('next-input-selector').toString());
		nextInputElement.focus();
	}
	else
	{
		Grocy.Components.TransferLocationPicker.GetInputElement().focus();
	}
}

Grocy.Components.TransferLocationPicker.PopupOpen = false;
$('#location_id_to_text_input').on('blur', function(e)
{
	if (Grocy.Components.TransferLocationPicker.GetPicker().hasClass("combobox-menu-visible"))
	{
		return;
	}
	$('#location_id_to').attr("barcode", "null");

	var input = $('#location_id_to_text_input').val().toString();
	var possibleOptionElement = [];

	// Grocycode handling
	if (input.startsWith("grcy"))
	{
		var gc = input.split(":");
		if (gc[1] == "l")
		{
			possibleOptionElement = $("#location_id_to option[value=\"" + gc[2] + "\"]").first();
			$("#location_id_to").data("grocycode", true);
			$('#location_id_to').attr("barcode", input);
		}
	}

	if (GetUriParam('flow') === undefined && input.length > 0 && possibleOptionElement.length > 0)
	{
		$('#location_id_to').val(possibleOptionElement.val());
		$('#location_id_to').attr("barcode", input);
		$('#location_id_to').data('combobox').refresh();
		$('#location_id_to').trigger('change');
	}
	else
	{
		if (Grocy.Components.TransferLocationPicker.PopupOpen === true)
		{
			return;
		}

		var optionElement = $("#location_id_to option:contains(\"" + input + "\")").first();
		if (input.length > 0 && optionElement.length === 0 && GetUriParam('flow') === undefined && Grocy.Components.TransferLocationPicker.GetPicker().parent().data('disallow-all-product-workflows').toString() === "false")
		{
			var addProductWorkflowsAdditionalCssClasses = "";
			if (Grocy.Components.TransferLocationPicker.GetPicker().parent().data('disallow-add-product-workflows').toString() === "true")
			{
				addProductWorkflowsAdditionalCssClasses = "d-none";
			}

			var embedded = "";
			if (GetUriParam("embedded") !== undefined)
			{
				embedded = "embedded";
			}

			var buttons = {
				cancel: {
					label: __t('Cancel'),
					className: 'btn-secondary responsive-button transferlocationpicker-workflow-cancel-button',
					callback: function()
					{
						Grocy.Components.TransferLocationPicker.PopupOpen = false;
						setTimeout(function()
						{
							Grocy.Components.TransferLocationPicker.GetInputElement().focus();
							Grocy.Components.TransferLocationPicker.GetInputElement().select();
						}, Grocy.FormFocusDelay);
					}
				},
			};

			if (!Grocy.FeatureFlags.GROCY_FEATURE_FLAG_DISABLE_BROWSER_BARCODE_CAMERA_SCANNING)
			{
				buttons.retrycamerascanning = {
					label: '<strong>C</strong> <i class="fa-solid fa-camera"></i>',
					className: 'btn-primary responsive-button retry-camera-scanning-button',
					callback: function()
					{
						Grocy.Components.TransferLocationPicker.PopupOpen = false;
						Grocy.Components.TransferLocationPicker.SetValue('');
						$("#camerabarcodescanner-start-button").click();
					}
				};
			}

			// The product picker contains only in stock products on some pages,
			// so only show the workflow dialog when the entered input
			// does not match in existing product (name) or barcode,
			// otherwise an error validation message that the product is not in stock
			var existsAsProduct = false;
			var existsAsBarcode = false;
			Grocy.Api.Get('objects/product_barcodes_view?query[]=barcode=' + input,
				function(barcodeResult)
				{
					if (barcodeResult.length > 0)
					{
						existsAsBarcode = true;
					}

					Grocy.Api.Get('objects/products?query[]=name=' + input,
						function(productResult)
						{
							if (productResult.length > 0)
							{
								existsAsProduct = true;
							}

							if (!existsAsBarcode && !existsAsProduct)
							{
								Grocy.Components.TransferLocationPicker.PopupOpen = true;
								bootbox.dialog({
									message: __t('"%s" could not be resolved to a product, how do you want to proceed?', input),
									title: __t('Create or assign product'),
									onEscape: function()
									{
										$(".transferlocationpicker-workflow-cancel-button").click();
									},
									size: 'large',
									backdrop: true,
									closeButton: false,
									buttons: buttons,
									className: "wider custom-escape-key-handling",
								}).on('keypress', function(e)
								{
									if (e.key === 'B' || e.key === 'b')
									{
										$('.add-new-barcode-dialog-button').not(".d-none").click();
									}
									else if (e.key === 'p' || e.key === 'P')
									{
										$('.add-new-product-dialog-button').not(".d-none").click();
									}
									else if (e.key === 'a' || e.key === 'A')
									{
										$('.add-new-product-with-barcode-dialog-button').not(".d-none").click();
									}
									else if (e.key === 'c' || e.key === 'C')
									{
										$('.retry-camera-scanning-button').not(".d-none").click();
									}
									else if (e.key === 'e' || e.key === 'E')
									{
										$('.add-new-product-plugin-dialog-button').not(".d-none").click();
									}
								});
							}
							else
							{
								Grocy.Components.ProductAmountPicker.Reset();
								Grocy.Components.TransferLocationPicker.Clear();
								Grocy.FrontendHelpers.ValidateForm('consume-form');
								Grocy.Components.TransferLocationPicker.ShowCustomError(__t('This product is not in stock'));
								setTimeout(function()
								{
									Grocy.Components.TransferLocationPicker.GetInputElement().focus();
								}, Grocy.FormFocusDelay);
							}
						},
						function(xhr)
						{
							console.error(xhr);
						}
					);
				},
				function(xhr)
				{
					console.error(xhr);
				}
			);
		}
	}
});

$(document).on("Grocy.BarcodeScanned", function(e, barcode, target)
{
	if (!(target == "@transferlocationpicker" || target == "undefined" || target == undefined)) // Default target
	{
		return;
	}

	// Don't know why the blur event does not fire immediately ... this works...
	Grocy.Components.TransferLocationPicker.GetInputElement().focusout();
	Grocy.Components.TransferLocationPicker.GetInputElement().focus();
	Grocy.Components.TransferLocationPicker.GetInputElement().blur();

	Grocy.Components.TransferLocationPicker.GetInputElement().val(barcode);

	setTimeout(function()
	{
		Grocy.Components.TransferLocationPicker.GetInputElement().focusout();
		Grocy.Components.TransferLocationPicker.GetInputElement().focus();
		Grocy.Components.TransferLocationPicker.GetInputElement().blur();
	}, Grocy.FormFocusDelay);
});

$(document).on("shown.bs.modal", function(e)
{
	$(".modal-footer").addClass("d-block").addClass("d-sm-flex");
	$(".modal-footer").find("button").addClass("mt-2").addClass("mt-sm-0");
})

// Make that ENTER behaves the same like TAB (trigger blur to start workflows, but only when the dropdown is not opened)
$('#location_id_to_text_input').keydown(function(event)
{
	if (event.keyCode === 13) // Enter
	{
		if (Grocy.Components.TransferLocationPicker.GetPicker().hasClass("combobox-menu-visible"))
		{
			return;
		}

		$("#location_id_to_text_input").trigger("blur");
	}
});

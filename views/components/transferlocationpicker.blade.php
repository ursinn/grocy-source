@php require_frontend_packages(['bootstrap-combobox']); @endphp

@once
@push('componentScripts')
<script src="{{ $U('/viewjs/components/transferlocationpicker.js', true) }}?v={{ $version }}"></script>
@endpush
@endonce

@php if(empty($disallowAllProductWorkflows)) { $disallowAllProductWorkflows = false; } @endphp
@php if(empty($prefillByName)) { $prefillByName = ''; } @endphp
@php if(empty($prefillById)) { $prefillById = ''; } @endphp
@php if(!isset($isRequired)) { $isRequired = true; } @endphp
@php if(!isset($label)) { $label = 'To location'; } @endphp
@php if(empty($validationMessage)) { $validationMessage = 'You have to select a product'; } @endphp
@php if(empty($additionalGroupCssClasses)) { $additionalGroupCssClasses = ''; } @endphp

<div class="form-group {{ $additionalGroupCssClasses }}"
	data-disallow-add-product-workflows="true"
	data-disallow-all-product-workflows="{{ BoolToString($disallowAllProductWorkflows) }}"
	data-prefill-by-name="{{ $prefillByName }}"
	data-prefill-by-id="{{ $prefillById }}">
	<label class="w-100"
		for="location_id_to">
		{{ $__t($label) }}
		<span id="barcode-lookup-disabled-hint"
			class="small text-muted d-none float-right"> {{ $__t('Barcode lookup is disabled') }}</span>
		<i id="barcode-lookup-hint"
			class="fa-solid fa-barcode float-right mt-1"></i>
	</label>
	<select class="form-control transferlocation-combobox barcodescanner-input"
		id="location_id_to"
		name="location_id_to"
		@if($isRequired)
		required
		@endif
		data-target="@transferlocationpicker">
		<option value=""></option>
		@foreach($locations as $location)
		@php $bc = null;
		if(isset($barcodes)) {
		$bc = FindObjectInArrayByPropertyValue($barcodes, 'location_id', $location->id);
		}
		@endphp
		<option data-additional-searchdata="@if(isset($bc)){{ strtolower($bc->barcodes) }}@endif,"
			value="{{ $location->id }}" data-is-freezer="{{ $location->is_freezer }}">{{ $location->name }}</option>
		@endforeach
	</select>
	<div class="invalid-feedback">{{ $__t($validationMessage) }}</div>
	<div id="custom-transferlocationpicker-error"
		class="form-text text-danger d-none"></div>
</div>

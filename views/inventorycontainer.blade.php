@extends('layout.default')

@section('title', $__t('Inventory container'))

@section('content')
<script>
	Grocy.QuantityUnits = {!! json_encode($quantityUnits) !!};
	Grocy.ContainerWeightUserfield = {!! json_encode($container_weight_userfield) !!};
	Grocy.WeightPrecisionTolerance = {!! json_encode($weight_precision_tolerance) !!};
</script>

<div class="row">
	<div class="col-12 col-md-6 col-xl-4 pb-3">
		<h2 class="title">@yield('title')</h2>
		
		<hr class="my-2">

		<div class="alert alert-info" role="alert">
			<i class="fa-solid fa-info-circle"></i>
			{{ $__t('Scan the barcode on your container to perform inventory by container weight. Each container can have its own tare weight set via stock entry user fields.') }}
		</div>

		<form id="container-inventory-form" novalidate>

			<div class="form-group">
				<label class="w-100" for="container_scanner">{{ $__t('Container barcode') }}
					<i id="barcode-lookup-hint"
						class="fa-solid fa-barcode float-right mt-1"></i>
				</label>
				<div class="input-group">
					<input type="text"
						class="form-control barcodescanner-input"
						id="container_scanner"
						name="container_tag"
						data-target="#container_scanner"
						autocomplete="off">
				</div>
				<div class="invalid-feedback"></div>
			</div>

			<div id="container-details" class="d-none">
				<div class="card mb-3">
					<div class="card-header">
						<h5 class="card-title mb-0">{{ $__t('Container details') }}</h5>
					</div>
					<div class="card-body">
						<div class="row">
							<div class="col-6">
								<strong>{{ $__t('Product') }}:</strong><br>
								<span id="product_name"></span>
							</div>
							<div class="col-6">
								<strong>{{ $__t('Current amount') }}:</strong><br>
								<span id="current_amount"></span>
							</div>
						</div>
						<div class="row mt-2">
							<div class="col-6">
								<strong>{{ $__t('Location') }}:</strong><br>
								<span id="location_name"></span>
							</div>
							<div class="col-6">
								<strong>{{ $__t('Container weight') }}:</strong><br>
								<span id="container_weight"></span>
							</div>
						</div>
						<div class="row mt-2">
							<div class="col-12">
								<strong>{{ $__t('Best before') }}:</strong><br>
								<span id="best_before_date"></span>
							</div>
						</div>
					</div>
				</div>

				<div class="form-group">
					<label for="gross_weight">{{ $__t('Gross weight') }} <i class="fa-solid fa-question-circle text-muted" data-toggle="tooltip" title="{{ $__t('Total weight including container') }}"></i></label>
					<div class="input-group">
						<input type="number"
							class="form-control locale-number-input"
							id="gross_weight"
							name="gross_weight"
							step="{{ $weight_precision_tolerance }}"
							min="0"
							placeholder="0">
						<div class="input-group-append">
							<span class="input-group-text" id="gross_weight_unit"></span>
						</div>
					</div>
					<div class="invalid-feedback"></div>
				</div>

				<div class="form-group">
					<label>{{ $__t('Calculated net weight') }}</label>
					<div class="input-group">
						<input type="text"
							class="form-control"
							id="net_weight"
							readonly
							style="cursor: not-allowed;"
							tabindex="-1">
						<div class="input-group-append">
							<span class="input-group-text" id="net_weight_unit"></span>
						</div>
					</div>
					<small class="form-text text-muted">
						{{ $__t('Net weight = Gross weight - Container weight') }}
					</small>
				</div>

				<!-- Stock source/destination selection (hidden by default) -->
				<div id="stock-source-group" class="form-group d-none">
					<label for="source_stock_entry">{{ $__t('Stock source') }}</label>
					<select class="form-control" id="source_stock_entry" name="source_stock_entry">
						<option value="">{{ $__t('Select where this stock came from') }}</option>
					</select>
					<small class="form-text text-muted">
						{{ $__t('Select the stock entry that this additional stock was transferred from') }}
					</small>
					<div class="invalid-feedback"></div>
					
					<!-- Partial transfer info -->
					<div id="partial-transfer-info" class="alert alert-warning mt-2 d-none">
						<i class="fa-solid fa-exclamation-triangle"></i>
						<span id="partial-transfer-message"></span>
					</div>
					
					<!-- Option to allow remaining stock modification -->
					<div id="stock-modification-option" class="mt-2 d-none">
						<div class="custom-control custom-radio">
							<input class="custom-control-input" type="radio" name="partial_transfer_mode" id="add_remaining" value="add_remaining">
							<label class="custom-control-label" for="add_remaining">
								{{ $__t('Add remaining stock without source') }}
							</label>
						</div>
						<div class="custom-control custom-radio">
							<input class="custom-control-input" type="radio" name="partial_transfer_mode" id="transfer_available_only" value="transfer_available_only">
							<label class="custom-control-label" for="transfer_available_only">
								{{ $__t('Only transfer what is available (adjust inventory to match)') }}
							</label>
						</div>
						<small class="form-text text-muted">
							<span id="remaining-modification-details"></span>
						</small>
					</div>
				</div>

				<div id="stock-destination-group" class="form-group d-none">
					<label for="destination_type">{{ $__t('Stock destination') }} <span class="text-danger">*</span></label>
					<div class="custom-control custom-radio">
						<input class="custom-control-input" type="radio" name="destination_type" id="destination_consume" value="consume" checked>
						<label class="custom-control-label" for="destination_consume">
							{{ $__t('Consumed') }}
						</label>
					</div>
					<div class="custom-control custom-radio">
						<input class="custom-control-input" type="radio" name="destination_type" id="destination_transfer" value="transfer">
						<label class="custom-control-label" for="destination_transfer">
							{{ $__t('Transferred to another stock entry') }}
						</label>
					</div>
					
					<div id="destination-stock-entry" class="mt-2 d-none">
						<select class="form-control" id="destination_stock_entry" name="destination_stock_entry">
							<option value="">{{ $__t('Select destination stock entry') }}</option>
						</select>
					</div>
					<div class="invalid-feedback"></div>
				</div>

				<button id="save-inventory"
					class="btn btn-success"
					type="submit">
					<i class="fa-solid fa-save"></i> {{ $__t('Save inventory') }}
				</button>

				<button id="clear-form"
					class="btn btn-secondary ml-2"
					type="button">
					<i class="fa-solid fa-trash"></i> {{ $__t('Clear') }}
				</button>
			</div>

		</form>

	</div>

	<div class="col-12 col-md-6 col-xl-4 hide-when-embedded">
		@include('components.productcard')
		
		<div class="mt-4">
			<h2 class="title">{{ $__t('Recent container inventories') }}</h2>
			<div id="recent-inventories-table"></div>
		</div>
	</div>
</div>

<div class="modal fade" id="container-weight-modal" tabindex="-1">
	<div class="modal-dialog">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">{{ $__t('Container weight not set') }}</h5>
				<button type="button" class="close" data-dismiss="modal">
					<span>&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<p>{{ $__t('This container does not have a container weight set. You need to set the container weight in the stock entry user fields before you can use container inventory.') }}</p>
				<p><strong>{{ $__t('Steps') }}:</strong></p>
				<ol>
					<li>{{ $__t('Go to Stock entries') }}</li>
					<li>{{ $__t('Find and edit this stock entry') }}</li>
					<li>{{ $__t('Set the "Stock Entry Container Weight" user field') }}</li>
					<li>{{ $__t('Return here and scan again') }}</li>
				</ol>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-dismiss="modal">{{ $__t('Close') }}</button>
				<a href="{{ $U('/stockentries') }}" class="btn btn-primary">{{ $__t('Go to Stock entries') }}</a>
			</div>
		</div>
	</div>
</div>

@include('components.camerabarcodescanner')

@stop
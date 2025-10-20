@extends('layout.default')

@section('title', $__t('Pending Scan Details'))

@section('content')
<div class="row">
	<div class="col">
		<div class="title-related-links">
			<h2 class="title">@yield('title')</h2>
			<div class="float-right">
				<a class="btn btn-outline-secondary"
					href="{{ $U('/pendingscans') }}">
					<i class="fa-solid fa-arrow-left"></i> {{ $__t('Back to list') }}
				</a>
			</div>
		</div>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col-12 col-md-6">
		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('Scan Information') }}</h5>
			</div>
			<div class="card-body">
				<dl class="row">
					<dt class="col-sm-4">{{ $__t('ID') }}</dt>
					<dd class="col-sm-8">#{{ $pendingScan->id }}</dd>

					<dt class="col-sm-4">{{ $__t('Created') }}</dt>
					<dd class="col-sm-8">{{ $pendingScan->row_created_timestamp }}</dd>

					<dt class="col-sm-4">{{ $__t('Barcode') }}</dt>
					<dd class="col-sm-8"><code>{{ $pendingScan->barcode }}</code></dd>

					<dt class="col-sm-4">{{ $__t('Operation') }}</dt>
					<dd class="col-sm-8">
						<span class="badge badge-secondary">{{ ucfirst($pendingScan->operation) }}</span>
					</dd>

					<dt class="col-sm-4">{{ $__t('Status') }}</dt>
					<dd class="col-sm-8">
						@if($pendingScan->resolved)
						<span class="badge badge-success">{{ $__t('Resolved') }}</span>
						@if($pendingScan->resolved_timestamp)
						<br><small class="text-muted">{{ $pendingScan->resolved_timestamp }}</small>
						@endif
						@else
						<span class="badge badge-warning">{{ $__t('Pending') }}</span>
						@endif
					</dd>

					@if($pendingScan->user_agent)
					<dt class="col-sm-4">{{ $__t('User Agent') }}</dt>
					<dd class="col-sm-8"><small>{{ $pendingScan->user_agent }}</small></dd>
					@endif

					@if($pendingScan->ip_address)
					<dt class="col-sm-4">{{ $__t('IP Address') }}</dt>
					<dd class="col-sm-8"><code>{{ $pendingScan->ip_address }}</code></dd>
					@endif
				</dl>
			</div>
		</div>
	</div>

	<div class="col-12 col-md-6">
		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('Error Details') }}</h5>
			</div>
			<div class="card-body">
				<div class="alert alert-danger">
					<strong>{{ $__t('Error Message') }}:</strong><br>
					{{ $pendingScan->error_message }}
				</div>

				@if($requestData)
				<h6>{{ $__t('Request Data') }}</h6>
				@if(isset($requestData['body']) && !empty($requestData['body']))
				<strong>{{ $__t('Request Body') }}:</strong>
				<pre class="bg-light p-2 rounded"><code>{{ json_encode($requestData['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</code></pre>
				@endif

				@if(isset($requestData['query_params']) && !empty($requestData['query_params']))
				<strong>{{ $__t('Query Parameters') }}:</strong>
				<pre class="bg-light p-2 rounded"><code>{{ json_encode($requestData['query_params'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</code></pre>
				@endif
				@endif
			</div>
		</div>
	</div>
</div>

<div class="row mt-3">
	<div class="col-12 col-md-6">
		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('Quick Actions') }}</h5>
			</div>
			<div class="card-body">
				<h6>{{ $__t('Common Solutions') }}</h6>

				@if(str_contains($pendingScan->error_message, 'No product with barcode'))
				<?php
					$pendingScanUrl = '/pendingscan/' . $pendingScan->id;
					$targetUrl = '';
					switch($pendingScan->operation) {
						case 'add':
							$targetUrl = '/purchase?flow=InplaceAddBarcodeToExistingProduct&barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode($pendingScanUrl);
							break;
						case 'consume':
							$targetUrl = '/consume?flow=InplaceAddBarcodeToExistingProduct&barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode($pendingScanUrl);
							break;
						case 'transfer':
							$targetUrl = '/transfer?flow=InplaceAddBarcodeToExistingProduct&barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode($pendingScanUrl);
							break;
						case 'inventory':
							$targetUrl = '/inventory?flow=InplaceAddBarcodeToExistingProduct&barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode($pendingScanUrl);
							break;
					}
				?>
				<a class="btn btn-primary btn-sm mb-2 d-block"
				    href="{{ $U($targetUrl) }}">
					<i class="fa-solid fa-barcode"></i> {{ $__t('Add Barcode to Existing Product') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('Find the product and add barcode') }} <code>{{ $pendingScan->barcode }}</code> {{ $__t('to it') }}</small>

				<?php
					// Build create product return URL from inside out:
					$createProductUrl = '/product/new?flow=InplaceNewProductWithBarcode&barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode($targetUrl);
				?>
				<a class="btn btn-outline-primary btn-sm mb-2 d-block"
					href="{{ $U($createProductUrl) }}">
					<i class="fa-solid fa-plus"></i> {{ $__t('Create New Product') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('If the product doesn\'t exist, create a new one with this barcode') }}</small>
				@endif

				@if($pendingScan->operation === 'add')
				<a class="btn btn-info btn-sm mb-2 d-block"
					href="{{ $U('/purchase?barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode('/pendingscan/' . $pendingScan->id)) }}">
					<i class="fa-solid fa-cart-plus"></i> {{ $__t('Add Stock (Purchase)') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('Purchase/add stock for this barcode') }}</small>
				@endif

				@if($pendingScan->operation === 'consume')
				<a class="btn btn-info btn-sm mb-2 d-block"
					href="{{ $U('/consume?barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode('/pendingscan/' . $pendingScan->id)) }}">
					<i class="fa-solid fa-utensils"></i> {{ $__t('Consume Stock') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('Try the consume operation again') }}</small>
				@endif

				@if($pendingScan->operation === 'transfer')
				<a class="btn btn-info btn-sm mb-2 d-block"
					href="{{ $U('/transfer?barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode('/pendingscan/' . $pendingScan->id)) }}">
					<i class="fa-solid fa-exchange-alt"></i> {{ $__t('Transfer Stock') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('Try the transfer operation again') }}</small>
				@endif

				@if($pendingScan->operation === 'open')
				<a class="btn btn-info btn-sm mb-2 d-block"
					href="{{ $U('/consume?barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode('/pendingscan/' . $pendingScan->id)) }}">
					<i class="fa-solid fa-box-open"></i> {{ $__t('Open Product') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('Try the open operation again') }}</small>
				@endif

				@if($pendingScan->operation === 'inventory')
				<a class="btn btn-warning btn-sm mb-2 d-block"
					href="{{ $U('/inventory?barcode=' . urlencode($pendingScan->barcode) . '&returnto=' . urlencode('/pendingscan/' . $pendingScan->id)) }}">
					<i class="fa-solid fa-list"></i> {{ $__t('Inventory Management') }}
				</a>
				<small class="text-muted d-block mb-3">{{ $__t('Adjust inventory for this barcode') }}</small>
				@endif
			</div>
		</div>
	</div>

	<div class="col-12 col-md-6">
		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('Scan Actions') }}</h5>
			</div>
			<div class="card-body">
				<button class="btn btn-success resolve-scan-button mr-2"
					data-scan-id="{{ $pendingScan->id }}">
					<i class="fa-solid fa-check"></i> {{ $__t('Mark as Resolved') }}
				</button>

				<button class="btn btn-danger delete-scan-button"
					data-scan-id="{{ $pendingScan->id }}">
					<i class="fa-solid fa-trash"></i> {{ $__t('Delete') }}
				</button>

				@if(!$pendingScan->resolved)
				<div class="mt-3">
					<small class="text-muted">
						{{ $__t('Use the quick actions above to resolve the underlying issue, then mark this scan as resolved.') }}
					</small>
				</div>
				@endif

				@if($requestData && isset($requestData['method']))
				<div class="mt-3 p-2 bg-light rounded">
					<strong class="text-dark">{{ $__t('Original Request') }}:</strong><br>
					<small class="text-monospace text-dark">{{ $requestData['method'] }} {{ $requestData['path'] }}</small>
					@if(!empty($requestData['query_params']))
					<br><small class="text-secondary">{{ $__t('Query params') }}: {{ http_build_query($requestData['query_params']) }}</small>
					@endif
				</div>
				@endif
			</div>
		</div>
	</div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
	$(document).on('click', '.resolve-scan-button', function() {
		const scanId = $(this).data('scan-id');

		fetch(`/api/pending-scans/${scanId}/resolve`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			}
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				window.location.href = '{{ $U('/pendingscans') }}';
			} else {
				alert('{{ $__t('An error occurred') }}');
			}
		})
		.catch(error => {
			alert('{{ $__t('An error occurred') }}');
		});
	});

	$(document).on('click', '.delete-scan-button', function() {
		const scanId = $(this).data('scan-id');

		if (confirm('{{ $__t('Are you sure you want to delete this scan?') }}')) {
			fetch(`/api/pending-scans/${scanId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				}
			})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					window.location.href = '{{ $U('/pendingscans') }}';
				} else {
					alert('{{ $__t('An error occurred') }}');
				}
			})
			.catch(error => {
				alert('{{ $__t('An error occurred') }}');
			});
		}
	});
});
</script>
@stop

@extends('layout.default')

@section('title', $__t('Inventory by stock entry container weight - Setup required'))

@section('content')

<div class="row">
	<div class="col-12 col-md-8 col-xl-6">
		<h2 class="title">@yield('title')</h2>
		
		<hr class="my-2">

		<div class="alert alert-warning" role="alert">
			<h4 class="alert-heading"><i class="fa-solid fa-exclamation-triangle"></i> {{ $__t('Setup required') }}</h4>
			<p>{{ $__t('To use the "Inventory by stock entry container weight" feature, you need to create a specific user field first.') }}</p>
		</div>

		<div class="card">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('Required user field') }}</h5>
			</div>
			<div class="card-body">
				<dl class="row">
					<dt class="col-sm-4">{{ $__t('Entity') }}:</dt>
					<dd class="col-sm-8"><code>{{ $required_userfield_entity }}</code></dd>
					
					<dt class="col-sm-4">{{ $__t('Name') }}:</dt>
					<dd class="col-sm-8"><code>{{ $required_userfield_name }}</code></dd>
					
					<dt class="col-sm-4">{{ $__t('Type') }}:</dt>
					<dd class="col-sm-8"><code>Number (decimal)</code></dd>
					
					<dt class="col-sm-4">{{ $__t('Purpose') }}:</dt>
					<dd class="col-sm-8">{{ $__t('Stores the tare/container weight for individual stock entries') }}</dd>
				</dl>
			</div>
		</div>

		<div class="card mt-3">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('Setup instructions') }}</h5>
			</div>
			<div class="card-body">
				<ol>
					<li>{{ $__t('Go to "Manage user fields"') }}</li>
					<li>{{ $__t('Click "Add user field"') }}</li>
					<li>{{ $__t('Set the following values') }}:
						<ul class="mt-2">
							<li><strong>{{ $__t('Entity') }}:</strong> {{ $required_userfield_entity }}</li>
							<li><strong>{{ $__t('Name') }}:</strong> {{ $required_userfield_name }}</li>
							<li><strong>{{ $__t('Caption') }}:</strong> {{ $__t('Stock Entry Container Weight') }} ({{ $__t('or your preferred display name') }})</li>
							<li><strong>{{ $__t('Type') }}:</strong> {{ $__t('Number (decimal)') }}</li>
							<li><strong>{{ $__t('Show as column in tables') }}:</strong> {{ $__t('Yes (recommended)') }}</li>
						</ul>
					</li>
					<li>{{ $__t('Save the user field') }}</li>
					<li>{{ $__t('Return to this page') }}</li>
				</ol>
			</div>
		</div>

		<div class="card mt-3">
			<div class="card-header">
				<h5 class="card-title mb-0">{{ $__t('How it works') }}</h5>
			</div>
			<div class="card-body">
				<p>{{ $__t('Once the user field is created, you can:') }}</p>
				<ol>
					<li>{{ $__t('Set container weights for individual stock entries via "Stock entries" page') }}</li>
					<li>{{ $__t('Use this inventory feature to scan container barcodes') }}</li>
					<li>{{ $__t('Enter gross weight (total weight including container)') }}</li>
					<li>{{ $__t('The system automatically calculates net weight by subtracting the container weight') }}</li>
					<li>{{ $__t('Stock amount gets updated with the calculated net weight') }}</li>
				</ol>
				
				<div class="alert alert-info mt-3" role="alert">
					<strong>{{ $__t('Benefits') }}:</strong>
					<ul class="mb-0">
						<li>{{ $__t('Each container can have its own tare weight') }}</li>
						<li>{{ $__t('No modifications to core Grocy code') }}</li>
						<li>{{ $__t('Works alongside existing inventory system') }}</li>
						<li>{{ $__t('Automatic stock entry separation (containers with user fields never merge)') }}</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="mt-4">
			<a href="{{ $U('/userfields') }}" class="btn btn-primary">
				<i class="fa-solid fa-plus"></i> {{ $__t('Go to user fields management') }}
			</a>
			
			<a href="{{ $U('/inventory-container') }}" class="btn btn-secondary ml-2">
				<i class="fa-solid fa-refresh"></i> {{ $__t('Check again') }}
			</a>
			
			<a href="{{ $U('/stockoverview') }}" class="btn btn-outline-secondary ml-2">
				<i class="fa-solid fa-arrow-left"></i> {{ $__t('Back to stock overview') }}
			</a>
		</div>

	</div>
</div>

@stop
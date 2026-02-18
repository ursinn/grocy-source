@php require_frontend_packages(['datatables']); @endphp

@extends('layout.default')

@section('title', $__t('Stock journal'))

@section('content')
<div class="title-related-links">
	<h2 class="title">@yield('title')</h2>
	<div class="float-right @if($embedded) pr-5 @endif">
		<button class="btn btn-outline-dark d-md-none mt-2 order-1 order-md-3"
			type="button"
			data-toggle="collapse"
			data-target="#table-filter-row">
			<i class="fa-solid fa-filter"></i>
		</button>
		<button class="btn btn-outline-dark d-md-none mt-2 order-1 order-md-3 hide-when-embedded"
			type="button"
			data-toggle="collapse"
			data-target="#related-links">
			<i class="fa-solid fa-ellipsis-v"></i>
		</button>
	</div>
	<div class="related-links collapse d-md-flex order-2 width-xs-sm-100"
		id="related-links">
		<a class="btn btn-outline-dark responsive-button m-1 mt-md-0 mb-md-0 float-right hide-when-embedded"
			href="{{ $U('/stockjournal/summary') }}">
			{{ $__t('Journal summary') }}
		</a>
	</div>
</div>

<hr class="my-2">

<div class="row collapse d-md-flex"
	id="table-filter-row">
	<div class="col-12 col-md-6 col-xl-2">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-search"></i></span>
			</div>
			<input type="text"
				id="search"
				class="form-control"
				placeholder="{{ $__t('Search') }}">
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3 hide-when-embedded">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-filter"></i>&nbsp;{{ $__t('Product') }}</span>
			</div>
			<select class="custom-control custom-select"
				id="product-filter">
				<option value="all">{{ $__t('All') }}</option>
				@foreach($products as $product)
				<option value="{{ $product->id }}">{{ $product->name }}</option>
				@endforeach
			</select>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-filter"></i>&nbsp;{{ $__t('Transaction type') }}</span>
			</div>
			<select class="custom-control custom-select"
				id="transaction-type-filter">
				<option value="all">{{ $__t('All') }}</option>
				@foreach($transactionTypes as $transactionType)
				<option value="{{ $transactionType }}">{{ $__t($transactionType) }}</option>
				@endforeach
			</select>
		</div>
	</div>
	@if(GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING)
	<div class="col-12 col-md-6 col-xl-3">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-filter"></i>&nbsp;{{ $__t('Location') }}</span>
			</div>
			<select class="custom-control custom-select"
				id="location-filter">
				<option value="all">{{ $__t('All') }}</option>
				@foreach($locations as $location)
				<option value="{{ $location->id }}">{{ $location->name }}</option>
				@endforeach
			</select>
		</div>
	</div>
	@endif
	<div class="col-12 col-md-6 col-xl-2 @if(!$embedded) mt-1 @endif">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-filter"></i>&nbsp;{{ $__t('User') }}</span>
			</div>
			<select class="custom-control custom-select"
				id="user-filter">
				<option value="all">{{ $__t('All') }}</option>
				@foreach($users as $user)
				<option value="{{ $user->id }}">{{ $user->display_name }}</option>
				@endforeach
			</select>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3 mt-1">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-clock"></i>&nbsp;{{ $__t('Date range') }}</span>
			</div>
			<select class="custom-control custom-select"
				id="daterange-filter">
				<option value="5"
					selected>{{ $__n(5, '%s day', '%s days') }}</option>
				<option value="15">{{ $__n(15, '%s day', '%s days') }}</option>
				<option value="30">{{ $__n(1, '%s month', '%s months') }}</option>
				<option value="180">{{ $__n(6, '%s month', '%s months') }}</option>
				<option value="365">{{ $__n(1, '%s year', '%s years') }}</option>
				<option value="730">{{ $__n(2, '%s month', '%s years') }}</option>
				<option value="99999">{{ $__t('All') }}</option>
			</select>
		</div>
	</div>
	<div class="col">
		<div class="float-right mt-1">
			<button id="clear-filter-button"
				class="btn btn-sm btn-outline-info"
				data-toggle="tooltip"
				title="{{ $__t('Clear filter') }}">
				<i class="fa-solid fa-filter-circle-xmark"></i>
			</button>
		</div>
	</div>
</div>

<div class="row mt-2">
	<div class="col">
		<table id="stock-journal-table"
			class="table table-sm table-striped nowrap w-100">
			<thead>
				<tr>
					<th class="border-right"><a class="text-muted change-table-columns-visibility-button"
							data-toggle="tooltip"
							title="{{ $__t('Table options') }}"
							data-table-selector="#stock-journal-table"
							href="#"><i class="fa-solid fa-eye"></i></a>
					</th>
					<th class="allow-grouping">{{ $__t('Product') }}</th>
					<th>{{ $__t('Amount') }}</th>
					<th>{{ $__t('Transaction time') }}</th>
					<th class="allow-grouping">{{ $__t('Transaction type') }}</th>
					<th class="@if(!GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING) d-none @endif allow-grouping">{{ $__t('Location') }}</th>
					<th class="allow-grouping">{{ $__t('Done by') }}</th>
					<th>{{ $__t('Note') }}</th>

					@include('components.userfields_thead', array(
					'userfields' => $userfieldsStock
					))
				</tr>
			</thead>
			<tbody class="d-none">
				@foreach($stockLog as $stockLogEntry)
				<tr id="stock-booking-{{ $stockLogEntry->id }}-row"
					class="@if($stockLogEntry->undone == 1) text-muted @endif stock-booking-correlation-{{ $stockLogEntry->correlation_id }}"
					data-correlation-id="{{ $stockLogEntry->correlation_id }}">
					<td class="fit-content border-right">
						<a class="btn btn-secondary btn-xs undo-stock-booking-button @if($stockLogEntry->undone == 1) disabled @endif"
							href="#"
							data-booking-id="{{ $stockLogEntry->id }}"
							data-toggle="tooltip"
							data-placement="left"
							title="{{ $__t('Undo transaction') }}">
							<i class="fa-solid fa-undo"></i>
						</a>
						<div class="dropdown d-inline-block">
							<button class="btn btn-xs btn-light text-secondary stock-journal-context-menu-button"
								type="button"
								data-booking-id="{{ $stockLogEntry->id }}"
								data-product-id="{{ $stockLogEntry->product_id }}"
								data-product-name="{{ $stockLogEntry->product_name }}"
								data-correlation-id="{{ $stockLogEntry->correlation_id }}">
								<i class="fa-solid fa-ellipsis-v"></i>
							</button>
						</div>
					</td>
					<td class="productcard-trigger cursor-link"
						data-product-id="{{ $stockLogEntry->product_id }}">
						<span class="name-anchor @if($stockLogEntry->undone == 1) text-strike-through @endif">{{ $stockLogEntry->product_name }}</span>
						@if($stockLogEntry->undone == 1)
						<br>
						{{ $__t('Undone on') . ' ' . $stockLogEntry->undone_timestamp }}
						<time class="timeago timeago-contextual"
							datetime="{{ $stockLogEntry->undone_timestamp }}"></time>
						@endif
					</td>
					<td>
						<span class="locale-number locale-number-quantity-amount">{{ $stockLogEntry->amount }}</span> {{ $__n($stockLogEntry->amount, $stockLogEntry->qu_name, $stockLogEntry->qu_name_plural, true) }}
					</td>
					<td>
						{{ $stockLogEntry->row_created_timestamp }}
						<time class="timeago timeago-contextual"
							datetime="{{ $stockLogEntry->row_created_timestamp }}"></time>
					</td>
					<td>
						{{ $__t($stockLogEntry->transaction_type) }}
						@if ($stockLogEntry->spoiled == 1)
						<span class="font-italic text-muted">{{ $__t('Spoiled') }}</span>
						@endif
					</td>
					<td class="@if(!GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING) d-none @endif">
						{{ $stockLogEntry->location_name }}
					</td>
					<td>
						{{ $stockLogEntry->user_display_name }}
					</td>
					<td>
						{{ $stockLogEntry->note }}
					</td>

					@include('components.userfields_tbody', array(
					'userfields' => $userfieldsStock,
					'userfieldValues' => FindAllObjectsInArrayByPropertyValue($userfieldValuesStock, 'object_id', $stockLogEntry->stock_id)
					))
				</tr>
				@endforeach
			</tbody>
		</table>
	</div>
</div>

<div class="modal fade"
	id="stock-journal-row-context-menu"
	tabindex="-1">
	<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">
					<span class="product-name"></span>
				</h5>
				<button type="button"
					class="close"
					data-dismiss="modal">
					<span>&times;</span>
				</button>
			</div>
			<div class="modal-body py-0">
				<div class="p-2">
					<div class="row no-gutters mb-2">
						@if(GROCY_FEATURE_FLAG_SHOPPINGLIST)
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link permission-SHOPPINGLIST_ITEMS_ADD modal-context-menu-button-compact context-menu-button-shopping-list"
								href="#"
								data-href-template="{{ $U('/shoppinglistitem/new?embedded&updateexistingproduct&list=1&product=') }}">
								<i class="fa-solid fa-shopping-cart"></i> <span>{{ $__t('Add to shopping list') }}</span>
							</a>
						</div>
						@endif
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link permission-STOCK_PURCHASE modal-context-menu-button-compact context-menu-button-purchase"
								href="#"
								data-href-template="{{ $U('/purchase?embedded&product=') }}">
								<i class="fa-solid fa-cart-plus"></i> <span>{{ $__t('Purchase') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link permission-STOCK_CONSUME modal-context-menu-button-compact context-menu-button-consume"
								href="#"
								data-href-template="{{ $U('/consume?embedded&product=') }}">
								<i class="fa-solid fa-utensils"></i> <span>{{ $__t('Consume') }}</span>
							</a>
						</div>
						@if(GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING)
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link permission-STOCK_TRANSFER modal-context-menu-button-compact context-menu-button-transfer"
								href="#"
								data-href-template="{{ $U('/transfer?embedded&product=') }}">
								<i class="fa-solid fa-exchange-alt"></i> <span>{{ $__t('Transfer') }}</span>
							</a>
						</div>
						@endif
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link permission-STOCK_INVENTORY modal-context-menu-button-compact context-menu-button-inventory"
								href="#"
								data-href-template="{{ $U('/inventory?embedded&product=') }}">
								<i class="fa-solid fa-list"></i> <span>{{ $__t('Inventory') }}</span>
							</a>
						</div>
					</div>

					<div class="row no-gutters mb-2">
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block productcard-trigger modal-context-menu-button-compact context-menu-button-info"
								href="#">
								<i class="fa-solid fa-info-circle"></i> <span>{{ $__t('Product overview') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link modal-context-menu-button-compact context-menu-button-stock-entries"
								href="#"
								data-href-template="{{ $U('/stockentries?embedded&product=') }}"
								data-dialog-type="table">
								<i class="fa-solid fa-boxes-stacked"></i> <span>{{ $__t('Stock entries') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link modal-context-menu-button-compact context-menu-button-info"
								href="#"
								data-href-template="{{ $U('/stockjournal/summary?embedded&product_id=') }}"
								data-dialog-type="table">
								<i class="fa-solid fa-table-list"></i> <span>{{ $__t('Stock journal summary') }}</span>
							</a>
						</div>
						@if(GROCY_FEATURE_FLAG_RECIPES)
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block modal-context-menu-button-compact context-menu-button-info"
								href="#"
								data-href-template="{{ $U('/recipes?search=') }}">
								<i class="fa-solid fa-pizza-slice"></i> <span>{{ $__t('Search for recipes containing this product') }}</span>
							</a>
						</div>
						@endif
					</div>

					<div class="row no-gutters mb-2">
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block permission-MASTER_DATA_EDIT link-return modal-context-menu-button-compact context-menu-button-edit"
								href="#"
								data-href="#"
								data-href-template="{{ $U('/product/') }}">
								<i class="fa-solid fa-edit"></i> <span>{{ $__t('Edit product') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block modal-context-menu-button-compact context-menu-button-download"
								href="#"
								data-href-template="{{ $U('/product/') }}"
								data-href-template-suffix="/grocycode?download=true">
								<i class="fa-solid fa-barcode"></i> <span>{!! str_replace('Grocycode', '<span class="ls-n1">Grocycode</span>', $__t('Download %s Grocycode', $__t('Product'))) !!}</span>
							</a>
						</div>
						@if(GROCY_FEATURE_FLAG_LABEL_PRINTER)
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block product-grocycode-label-print modal-context-menu-button-compact context-menu-button-print"
								href="#">
								<i class="fa-solid fa-print"></i> <span>{!! str_replace('Grocycode', '<span class="ls-n1">Grocycode</span>', $__t('Print %s Grocycode on label printer', $__t('Product'))) !!}</span>
							</a>
						</div>
						@endif
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button"
					class="btn btn-secondary"
					data-dismiss="modal">{{ $__t('Close') }}</button>
			</div>
		</div>
	</div>
</div>

@include('components.productcard', [
'asModal' => true
])
@stop

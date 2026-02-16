@php require_frontend_packages(['datatables', 'animatecss']); @endphp

@extends('layout.default')

@section('title', $__t('Stock entries'))



@section('content')
<div class="row">
	<div class="col">
		<h2 class="title">@yield('title')</h2>
		<div class="float-right @if($embedded) pr-5 @endif">
			<button class="btn btn-outline-dark d-md-none mt-2 order-1 order-md-3"
				type="button"
				data-toggle="collapse"
				data-target="#table-filter-row"
				aria-expanded="true">
				<i class="fa-solid fa-filter"></i>
			</button>
		</div>
	</div>
</div>

<hr class="my-2">

<div class="row collapse show d-md-flex"
	id="table-filter-row">
	<div class="col-12 col-md-6 col-xl-3 hide-when-embedded">
		@include('components.productpicker', array(
		'products' => $products,
		'disallowAllProductWorkflows' => true,
		'isRequired' => false,
		'additionalGroupCssClasses' => 'mb-0'
		))
	</div>
	@if(GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING)
	<div class="col-12 col-md-6 col-xl-3 mt-auto">
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
	<div class="col mt-auto">
		<div class="float-right mt-3">
			<button id="clear-filter-button"
				class="btn btn-sm btn-outline-info"
				data-toggle="tooltip"
				title="{{ $__t('Clear filter') }}">
				<i class="fa-solid fa-filter-circle-xmark"></i>
			</button>
		</div>
	</div>
</div>

<div class="row">
	<div class="col">
		<table id="stockentries-table"
			class="table table-sm table-striped nowrap w-100">
			<thead>
				<tr>
					<th class="border-right"><a class="text-muted change-table-columns-visibility-button"
							data-toggle="tooltip"
							title="{{ $__t('Table options') }}"
							data-table-selector="#stockentries-table"
							href="#"><i class="fa-solid fa-eye"></i></a>
					</th>
					<th class="d-none">Hidden product_id</th>
					<th class="allow-grouping">{{ $__t('Product') }}</th>
					<th>{{ $__t('Amount') }}</th>
					<th class="@if(!GROCY_FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING) d-none @endif allow-grouping">{{ $__t('Due date') }}</th>
					<th class="@if(!GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING) d-none @endif allow-grouping">{{ $__t('Location') }}</th>
					<th class="@if(!GROCY_FEATURE_FLAG_STOCK_PRICE_TRACKING) d-none @endif allow-grouping">{{ $__t('Store') }}</th>
					<th class="@if(!GROCY_FEATURE_FLAG_STOCK_PRICE_TRACKING) d-none @endif">{{ $__t('Price') }}</th>
					<th class="allow-grouping"
						data-shadow-rowgroup-column="9">{{ $__t('Purchased date') }}</th>
					<th class="d-none">Hidden purchased_date</th>
					<th>{{ $__t('Timestamp') }}</th>
					<th>{{ $__t('Note') }}</th>

					@include('components.userfields_thead', array(
					'userfields' => $userfieldsProducts
					))

					@include('components.userfields_thead', array(
					'userfields' => $userfieldsStock
					))
				</tr>
			</thead>
			<tbody class="d-none">
				@foreach($stockEntries as $stockEntry)
				@php
					$product = FindObjectInArrayByPropertyValue($products, 'id', $stockEntry->product_id);
					$productQu = FindObjectInArrayByPropertyValue($quantityunits, 'id', $product->qu_id_stock);
				@endphp
				<tr id="stock-{{ $stockEntry->id }}-row"
					data-due-type="{{ $product->due_type }}"
					class="@if(GROCY_FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING && $stockEntry->best_before_date < date('Y-m-d 23:59:59', strtotime('-1 days')) && $stockEntry->amount > 0) @if($product->due_type == 1) table-secondary @else table-danger @endif @elseif(GROCY_FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING && $stockEntry->best_before_date < date('Y-m-d 23:59:59', strtotime('+' . $nextXDays . ' days'))
					&&
					$stockEntry->amount > 0) table-warning @endif">
					<td class="fit-content border-right">
						<a class="btn btn-danger btn-sm stock-consume-button"
							href="#"
							data-toggle="tooltip"
							data-placement="left"
							title="{{ $__t('Consume this stock entry') }}"
							data-product-id="{{ $stockEntry->product_id }}"
							data-stock-id="{{ $stockEntry->stock_id }}"
							data-stockrow-id="{{ $stockEntry->id }}"
							data-location-id="{{ $stockEntry->location_id }}"
							data-product-name="{{ $product->name }}"
							data-product-qu-name="{{ $productQu->name }}"
							data-consume-amount="{{ $stockEntry->amount }}">
							<i class="fa-solid fa-utensils"></i>
						</a>
						@if(GROCY_FEATURE_FLAG_STOCK_PRODUCT_OPENED_TRACKING)
						<a class="btn btn-success btn-sm product-open-button @if($stockEntry->open == 1 || $product->enable_tare_weight_handling == 1 || $product->disable_open == 1) disabled @endif"
							href="#"
							data-toggle="tooltip"
							data-placement="left"
							title="{{ $__t('Mark this stock entry as open') }}"
							data-product-id="{{ $stockEntry->product_id }}"
							data-product-name="{{ $product->name }}"
							data-product-qu-name="{{ $productQu->name }}"
							data-stock-id="{{ $stockEntry->stock_id }}"
							data-stockrow-id="{{ $stockEntry->id }}"
							data-open-amount="{{ $stockEntry->amount }}">
							<i class="fa-solid fa-box-open"></i>
						</a>
						@endif
						<a class="btn btn-info btn-sm show-as-dialog-link"
							href="{{ $U('/stockentry/' . $stockEntry->id . '?embedded') }}"
							data-toggle="tooltip"
							data-placement="left"
							title="{{ $__t('Edit stock entry') }}">
							<i class="fa-solid fa-edit"></i>
						</a>
						<button class="btn btn-sm btn-light text-secondary stock-entry-context-menu-button"
							type="button"
							data-stock-entry-id="{{ $stockEntry->id }}"
							data-product-id="{{ $stockEntry->product_id }}"
							data-product-name="{{ $product->name }}"
							data-product-qu-name="{{ $productQu->name }}"
							data-stock-id="{{ $stockEntry->stock_id }}"
							data-stockrow-id="{{ $stockEntry->id }}"
							data-location-id="{{ $stockEntry->location_id }}"
							data-amount="{{ $stockEntry->amount }}"
							data-spoiled-text="{{ $__t('Consume this stock entry as spoiled', '1 ' . $productQu->name, $product->name) }}"
							data-grocycode-url="{{ $U('/stockentry/' . $stockEntry->id . '/grocycode?download=true') }}"
							data-label-url="{{ $U('/stockentry/' . $stockEntry->id . '/label') }}"
							data-consume-url="{{ $U('/consume?embedded&product=' . $stockEntry->product_id . '&locationId=' . $stockEntry->location_id . '&stockId=' . $stockEntry->stock_id) }}"
							data-transfer-url="{{ $U('/transfer?embedded&product=' . $stockEntry->product_id . '&locationId=' . $stockEntry->location_id . '&stockId=' . $stockEntry->stock_id) }}">
							<i class="fa-solid fa-ellipsis-v"></i>
						</button>
					</td>
					<td class="d-none">
						xx{{ $stockEntry->product_id }}xx,
						@if(!empty($stockEntry->parent_product_id))
						xx{{ $stockEntry->parent_product_id }}xx,
						@elseif($product && !empty($product->parent_product_id))
						xx{{ $product->parent_product_id }}xx,
						@endif
					</td>
					<td class="productcard-trigger cursor-link"
						data-product-id="{{ $stockEntry->product_id }}">
						{{ $product ? $product->name : '' }}
					</td>
					<td>
						<span class="custom-sort d-none">{{$stockEntry->amount}}</span>
						<span id="stock-{{ $stockEntry->id }}-amount"
							class="locale-number locale-number-quantity-amount">{{ $stockEntry->amount }}</span> <span id="product-{{ $stockEntry->product_id }}-qu-name">{{ $__n($stockEntry->amount, $productQu ? $productQu->name : '', $productQu ? $productQu->name_plural : '', true) }}</span>
						<span id="stock-{{ $stockEntry->id }}-opened-amount"
							class="small font-italic">@if($stockEntry->open == 1){{ $__n($stockEntry->amount, 'Opened', 'Opened') }}@endif</span>
					</td>
					<td class="@if(!GROCY_FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING) d-none @endif">
						<span id="stock-{{ $stockEntry->id }}-due-date">{{ $stockEntry->best_before_date }}</span>
						<time id="stock-{{ $stockEntry->id }}-due-date-timeago"
							class="timeago timeago-contextual"
							@if($stockEntry->best_before_date != "") datetime="{{ $stockEntry->best_before_date }} 23:59:59" @endif></time>
					</td>
					<td id="stock-{{ $stockEntry->id }}-location"
						class="@if(!GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING) d-none @endif"
						data-location-id="{{ $stockEntry->location_id }}">
						{{ FindObjectInArrayByPropertyValue($locations, 'id', $stockEntry->location_id)->name }}
					</td>
					<td id="stock-{{ $stockEntry->id }}-shopping-location"
						class="@if(!GROCY_FEATURE_FLAG_STOCK_PRICE_TRACKING) d-none @endif"
						data-shopping-location-id="{{ $stockEntry->shopping_location_id }}">
						@if (FindObjectInArrayByPropertyValue($shoppinglocations, 'id', $stockEntry->shopping_location_id) !== null)
						{{ FindObjectInArrayByPropertyValue($shoppinglocations, 'id', $stockEntry->shopping_location_id)->name }}
						@endif
					</td>
					<td class="@if(!GROCY_FEATURE_FLAG_STOCK_PRICE_TRACKING) d-none @endif">
						<span class="custom-sort d-none">{{$stockEntry->price}}</span>
						<span id="stock-{{ $stockEntry->id }}-price"
							data-toggle="tooltip"
							data-trigger="hover click"
							data-html="true"
							title="{!! $__t('%1$s per %2$s', '<span class=\'locale-number locale-number-currency\'>' . $stockEntry->price . '</span>', $productQu ? $productQu->name : '') !!}">
							@php
								$priceQuName = '';
								if ($product) {
									$priceQu = FindObjectInArrayByPropertyValue($quantityunits, 'id', $product->qu_id_price);
									if ($priceQu) {
										$priceQuName = $priceQu->name;
									}
								}
							@endphp
							{!! $__t('%1$s per %2$s', '<span class="locale-number locale-number-currency">' . $stockEntry->price * $stockEntry->qu_factor_price_to_stock . '</span>', $priceQuName) !!}
						</span>
					</td>
					<td>
						<span id="stock-{{ $stockEntry->id }}-purchased-date">{{ $stockEntry->purchased_date }}</span>
						<time id="stock-{{ $stockEntry->id }}-purchased-date-timeago"
							class="timeago timeago-contextual"
							@if(!empty($stockEntry->purchased_date)) datetime="{{ $stockEntry->purchased_date }} 23:59:59" @endif></time>
					</td>
					<td class="d-none">{{ $stockEntry->purchased_date }}</td>
					<td>
						<span>{{ $stockEntry->row_created_timestamp }}</span>
						<time class="timeago timeago-contextual"
							datetime="{{ $stockEntry->row_created_timestamp }}"></time>
					</td>
					<td>
						<span id="stock-{{ $stockEntry->id }}-note">{{ $stockEntry->note }}</span>
					</td>

					@include('components.userfields_tbody', array(
					'userfields' => $userfieldsProducts,
					'userfieldValues' => FindAllObjectsInArrayByPropertyValue($userfieldValuesProducts, 'object_id', $stockEntry->product_id)
					))

					@include('components.userfields_tbody', array(
					'userfields' => $userfieldsStock,
					'userfieldValues' => FindAllObjectsInArrayByPropertyValue($userfieldValuesStock, 'object_id', $stockEntry->stock_id)
					))

				</tr>
				@endforeach
			</tbody>
		</table>
	</div>
</div>

@include('components.productcard', [
'asModal' => true
])

<div class="modal fade"
	id="stockentry-context-menu"
	tabindex="-1">
	<div class="modal-dialog modal-dialog-scrollable">
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
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link stock-consume-link permission-STOCK_CONSUME modal-context-menu-button-compact context-menu-button-consume"
								href="#">
								<i class="fa-solid fa-utensils"></i> <span>{{ $__t('Consume') }}</span>
							</a>
						</div>
						@if(GROCY_FEATURE_FLAG_STOCK_LOCATION_TRACKING)
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link stock-transfer-link permission-STOCK_TRANSFER modal-context-menu-button-compact context-menu-button-transfer"
								href="#">
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
							<a class="btn btn-outline-secondary btn-block stock-consume-button stock-consume-button-spoiled permission-STOCK_CONSUME modal-context-menu-button-compact context-menu-button-consume-spoiled"
								href="#"
								data-dismiss="modal">
								<i class="fa-solid fa-circle-xmark"></i> <span class="spoiled-text"></span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block productcard-trigger modal-context-menu-button-compact context-menu-button-info"
								href="#">
								<i class="fa-solid fa-info-circle"></i> <span>{{ $__t('Product overview') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link modal-context-menu-button-compact context-menu-button-info"
								href="#"
								data-href-template="{{ $U('/stockjournal?embedded&product=') }}"
								data-dialog-type="table">
								<i class="fa-solid fa-clock-rotate-left"></i> <span>{{ $__t('Stock journal') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block show-as-dialog-link modal-context-menu-button-compact context-menu-button-info"
								href="#"
								data-href-template="{{ $U('/stockjournal/summary?embedded&product=') }}"
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
							<a class="btn btn-outline-secondary btn-block link-return permission-MASTER_DATA_EDIT modal-context-menu-button-compact context-menu-button-edit"
								href="#"
								data-href-template="{{ $U('/product/') }}">
								<i class="fa-solid fa-edit"></i> <span>{{ $__t('Edit product') }}</span>
							</a>
						</div>
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block stock-grocycode-link modal-context-menu-button-compact context-menu-button-download"
								href="#">
								<i class="fa-solid fa-barcode"></i> <span>{!! str_replace('Grocycode', '<span class="ls-n1">Grocycode</span>', $__t('Download %s Grocycode', $__t('Stock entry'))) !!}</span>
							</a>
						</div>
						@if(GROCY_FEATURE_FLAG_LABEL_PRINTER)
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block stockentry-grocycode-label-print modal-context-menu-button-compact context-menu-button-print"
								href="#">
								<i class="fa-solid fa-print"></i> <span>{!! str_replace('Grocycode', '<span class="ls-n1">Grocycode</span>', $__t('Print %s Grocycode on label printer', $__t('Stock entry'))) !!}</span>
							</a>
						</div>
						@endif
						<div class="col px-1">
							<a class="btn btn-outline-secondary btn-block stockentry-label-link modal-context-menu-button-compact"
								target="_blank"
								href="#">
								<i class="fa-solid fa-arrow-up-right-from-square"></i> <span>{{ $__t('Open stock entry label in new window') }}</span>
							</a>
						</div>
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

@stop

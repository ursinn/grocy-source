@extends('layout.default')

@section('title', $__t('Live Screen'))

@section('content')
<div class="container-fluid p-2">
	<div class="row mb-2">
		<div class="col d-flex justify-content-between align-items-center">
			<h2 class="mb-0">{{ $__t('Live Screen') }}</h2>
			<span id="connection-status" class="badge badge-secondary">Connecting...</span>
		</div>
	</div>

	<div class="row">
		<div class="col-12">
			<div id="activity-feed" class="activity-grid">
				<div class="activity-placeholder text-center text-muted p-5">
					<i class="fas fa-spinner fa-spin fa-3x mb-3"></i>
					<h4>{{ $__t('Waiting for activity...') }}</h4>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
.activity-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
	gap: 1.5rem;
	padding: 1rem;
}

.activity-item.undone {
	opacity: 0.6;
}

.activity-item {
	background: white;
	border-radius: 10px;
	border-left: 6px solid #ddd;
	box-shadow: 0 2px 8px rgba(0,0,0,0.1);
	padding: 1.5rem;
	animation: slideIn 0.6s ease-out;
	display: flex;
	flex-direction: column;
	height: 100%;
}

.activity-item:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 15px rgba(0,0,0,0.15);
	transition: all 0.2s ease;
}

.activity-item.consume {
	border-left-color: #dc3545;
}

.activity-item.purchase {
	border-left-color: #28a745;
}

.activity-item.transfer {
	border-left-color: #ffc107;
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateY(-20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.activity-time {
	font-size: 1.1em;
	color: #6c757d;
	font-weight: 500;
}

.activity-amount {
	font-weight: bold;
	font-size: 1.4em;
	margin: 0.5rem 0;
}

.activity-item .fas {
	font-size: 1.5em;
}

.activity-item strong {
	font-size: 2em;
	color: #333;
	font-weight: 700;
	line-height: 1;
}

.activity-item small {
	font-size: 1.1em;
	color: #666;
}

.activity-item .activity-amount {
	flex-grow: 1;
}

.stock-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: 1px solid #eee;
	padding-top: 0.5rem;
	margin-top: auto;
}

.stock-info strong {
	font-size: 1em;
	color: #495057;
}

.undo-btn {
	font-size: 0.8em;
	padding: 0.2rem 0.4rem;
}

.undo-btn:disabled {
	cursor: not-allowed;
}

.badge {
	font-size: 0.8rem;
	padding: 0.3rem 0.6rem;
}

/* Hide title row when connected */
.row.mb-2:has(#connection-status.badge-success) {
	display: none;
}

/* Fullscreen mode - hide navigation and use full viewport */
body:not(:hover) {
	overflow: hidden;
}

body:not(:hover) #mainNav,
body:not(:hover) .navbar,
body:not(:hover) .navbar-sidenav,
body:not(:hover) #sidebarResponsive {
	display: none !important;
}

body:not(:hover) .content-wrapper {
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	right: 0 !important;
	bottom: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	margin: 0 !important;
	padding: 0 !important;
	background: #f8f9fa !important;
}
/* end fullscreen mode */

.container-fluid {
	min-height: 100vh;
	margin: 0;
	padding: 0.5rem !important;
	background: #f8f9fa;
}

.activity-placeholder {
	grid-column: 1 / -1;
	background: #f8f9fa;
	border-radius: 10px;
	border: 2px dashed #dee2e6;
}

@media (min-width: 1200px) {
	.activity-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 1600px) {
	.activity-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

@media (min-width: 2000px) {
	.activity-grid {
		grid-template-columns: repeat(6, 1fr);
	}
}
</style>
@stop

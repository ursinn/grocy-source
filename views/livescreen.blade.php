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
/* =================================
   LAYOUT & GRID
   ================================= */
.container-fluid {
	min-height: 100vh;
	margin: 0;
	padding: 0.5rem !important;
}

.activity-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(25em, 1fr));
	gap: 1.5em;
	padding: 1em;
	max-width: none;
}

.activity-placeholder {
	grid-column: 1 / -1;
	background: #f8f9fa;
	border-radius: 0.625em;
	border: 0.125em dashed #dee2e6;
}

/* =================================
   ACTIVITY ITEMS - BASE STYLES
   ================================= */
.activity-item {
	background: white;
	border-radius: 0.625em;
	border-left: 0.125em solid #ddd;
	box-shadow: 0 0.125em 0.5em rgba(0,0,0,0.1);
	padding: 1.5em;
	animation: slideIn 0.6s ease-out;
	display: flex;
	flex-direction: column;
	height: 100%;
}

.activity-item:hover {
	transform: translateY(-0.125em);
	box-shadow: 0 0.25em 0.9375em rgba(0,0,0,0.15);
	transition: all 0.2s ease;
}

/* Activity type colors */
.activity-item.consume { border-left-color: #dc3545; }
.activity-item.purchase { border-left-color: #28a745; }
.activity-item.transfer { border-left-color: #ffc107; }
.activity-item.product-opened { border-left-color: #007bff; }
.activity-item.stock-edit { border-left-color: #6f42c1; }

/* =================================
   RECENT ACTIVITY HIGHLIGHTING
   ================================= */
.activity-item.recent {
	position: relative;
}

.activity-item.recent:not(.undone)::before {
	content: '';
	position: absolute;
	top: 0;
	right: 0;
	width: 0;
	height: 0;
	border-left: 1.5em solid transparent;
	border-top: 1.5em solid #17a2b8;
	border-top-right-radius: 0.625em;
}

/* =================================
   ACTIVITY ITEMS - UNDONE STATE
   ================================= */
.activity-item.undone {
	background: #f8f9fa;
	border-left-color: #6c757d !important;
	position: relative;
}

.activity-item.undone::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: repeating-linear-gradient(
		45deg,
		transparent,
		transparent 10px,
		rgba(108, 117, 125, 0.1) 10px,
		rgba(108, 117, 125, 0.1) 20px
	);
	border-radius: 10px;
	pointer-events: none;
}

.activity-item.undone .activity-amount {
	text-decoration: line-through;
	color: #6c757d !important;
}

/* =================================
   ACTIVITY ITEM CONTENT
   ================================= */
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

.activity-amount {
	font-weight: bold;
	font-size: 1.4em;
	margin: 0.5em 0;
	flex-grow: 1;
}

.activity-amount .fas {
	font-size: 1.2em !important;
	vertical-align: middle;
}

.activity-time {
	font-size: 1.1em;
	color: #6c757d;
	font-weight: 500;
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

/* =================================
   UI COMPONENTS
   ================================= */
.undo-btn {
	font-size: 0.8em;
	padding: 0.2rem 0.4rem;
}

.badge {
	font-size: 0.8rem;
	padding: 0.3rem 0.6rem;
}

.text-purple {
	color: #8b5cf6 !important;
}

/* =================================
   NIGHT MODE OVERRIDES
   ================================= */
.night-mode .activity-item {
	background: #3a3c3b;
	color: #c1c1c1;
}

.night-mode .activity-item.undone {
	background: #292b2a;
}

.night-mode .activity-item strong {
	color: #c1c1c1;
}

.night-mode .activity-item small {
	color: #8f9ba5;
}

.night-mode .activity-time {
	color: #8f9ba5;
}

.night-mode .stock-info strong {
	color: #c1c1c1;
}

.night-mode .activity-placeholder {
	background: #333131;
	border-color: #383838;
	color: #8f9ba5;
}

/* =================================
   IFRAME MODE
   ================================= */
.in-iframe .container-fluid {
	background: none !important;
}

/* =================================
   FULLSCREEN MODE
   ================================= */

body.controls-hidden {
	overflow: hidden !important;
	background: none !important;
}

body.controls-hidden #mainNav,
body.controls-hidden .navbar,
body.controls-hidden .navbar-sidenav,
body.controls-hidden #sidebarResponsive {
	display: none !important;
}

body.controls-hidden .content-wrapper {
	overflow: hidden !important;
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	right: 0 !important;
	bottom: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	margin: 0 !important;
	padding: 0 !important;
}

body.in-iframe.controls-hidden .content-wrapper {
	background: none !important;
}

/* Hide title row when connected */
.row.mb-2:has(#connection-status.badge-success) {
	display: none;
}

/* =================================
   ANIMATIONS
   ================================= */
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

/* =================================
   RESPONSIVE DESIGN
   ================================= */
@media (min-width: 1200px) {
	.activity-grid {
		grid-template-columns: repeat(3, 1fr);
		font-size: 1.1rem;
	}
}

@media (min-width: 1600px) {
	.activity-grid {
		grid-template-columns: repeat(4, 1fr);
		font-size: 1.3rem;
	}
}

@media (min-width: 2000px) {
	.activity-grid {
		grid-template-columns: repeat(4, 1fr);
		font-size: 1.5rem;
	}
}
</style>
@stop

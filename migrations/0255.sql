-- Create pending_scans table to store failed barcode scan operations for later manual resolution

CREATE TABLE pending_scans (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	barcode TEXT NOT NULL,
	operation TEXT NOT NULL, -- 'add', 'consume', 'transfer', 'inventory', 'open'
	request_data TEXT, -- JSON string containing the original request parameters
	error_message TEXT NOT NULL,
	user_agent TEXT,
	ip_address TEXT,
	resolved TINYINT NOT NULL DEFAULT 0,
	resolved_timestamp DATETIME DEFAULT NULL,
	resolved_by INTEGER DEFAULT NULL, -- user ID who resolved this
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- Add index for faster queries on common fields
CREATE INDEX IX_pending_scans_barcode ON pending_scans (barcode);
CREATE INDEX IX_pending_scans_operation ON pending_scans (operation);
CREATE INDEX IX_pending_scans_resolved ON pending_scans (resolved);
CREATE INDEX IX_pending_scans_row_created_timestamp ON pending_scans (row_created_timestamp);
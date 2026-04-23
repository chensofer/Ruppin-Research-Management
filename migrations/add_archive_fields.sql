-- Run this script once on the database to add archive support
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'research_projects' AND COLUMN_NAME = 'is_archived'
)
BEGIN
    ALTER TABLE research_projects ADD is_archived BIT NOT NULL DEFAULT 0;
    PRINT 'Added is_archived column';
END

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'research_projects' AND COLUMN_NAME = 'archived_at'
)
BEGIN
    ALTER TABLE research_projects ADD archived_at DATETIME NULL;
    PRINT 'Added archived_at column';
END

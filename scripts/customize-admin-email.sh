#!/bin/bash

# Script to customize the admin email in Supabase RLS policies
# Usage: ./scripts/customize-admin-email.sh your-email@example.com

if [ -z "$1" ]; then
    echo "Usage: $0 <your-email@example.com>"
    echo "Example: $0 newadmin@gmail.com"
    exit 1
fi

NEW_EMAIL="$1"
MIGRATION_FILE="supabase/migrations/0001_master.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found at $MIGRATION_FILE"
    echo "Run this script from the repository root."
    exit 1
fi

# Count occurrences before
BEFORE=$(grep -c "admin@example.com" "$MIGRATION_FILE")
echo "Found $BEFORE occurrences of the default admin email."

# Replace
sed -i "s/admin@example.com/$NEW_EMAIL/g" "$MIGRATION_FILE"

# Count occurrences after
AFTER=$(grep -c "$NEW_EMAIL" "$MIGRATION_FILE")
echo "Replaced with $NEW_EMAIL ($AFTER occurrences)."

echo "Done! Verify with: grep -n '$NEW_EMAIL' $MIGRATION_FILE"
